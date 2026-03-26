type BluetoothServiceUUIDLike = string | number
type BluetoothCharacteristicUUIDLike = string | number

type BluetoothCharacteristicLike = {
  uuid?: string
  properties: {
    write?: boolean
    writeWithoutResponse?: boolean
  }
  writeValue?: (value: BufferSource) => Promise<void>
  writeValueWithoutResponse?: (value: BufferSource) => Promise<void>
}

type BluetoothServiceLike = {
  uuid?: string
  getCharacteristic: (
    uuid: BluetoothCharacteristicUUIDLike
  ) => Promise<BluetoothCharacteristicLike>
  getCharacteristics: () => Promise<BluetoothCharacteristicLike[]>
}

type BluetoothServerLike = {
  getPrimaryService: (uuid: BluetoothServiceUUIDLike) => Promise<BluetoothServiceLike>
}

type BluetoothGattLike = {
  connect: () => Promise<BluetoothServerLike>
  disconnect: () => void
}

type BluetoothDeviceLike = {
  name?: string
  gatt?: BluetoothGattLike | null
}

type BluetoothLike = {
  requestDevice: (options: {
    acceptAllDevices?: boolean
    optionalServices?: BluetoothServiceUUIDLike[]
  }) => Promise<BluetoothDeviceLike>
}

type PrinterConnection = {
  device: BluetoothDeviceLike
  characteristic: BluetoothCharacteristicLike
  serviceId?: BluetoothServiceUUIDLike
  characteristicId?: BluetoothCharacteristicUUIDLike
}

const DEFAULT_SERVICE_CANDIDATES: BluetoothServiceUUIDLike[] = [
  "000018f0-0000-1000-8000-00805f9b34fb",
  "0000ffe0-0000-1000-8000-00805f9b34fb",
  "0000fff0-0000-1000-8000-00805f9b34fb",
  "0000ff00-0000-1000-8000-00805f9b34fb",
  "0000ae30-0000-1000-8000-00805f9b34fb",
  "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
]

const DEFAULT_CHARACTERISTIC_CANDIDATES: BluetoothCharacteristicUUIDLike[] = [
  "00002af1-0000-1000-8000-00805f9b34fb",
  "0000ffe1-0000-1000-8000-00805f9b34fb",
  "0000fff1-0000-1000-8000-00805f9b34fb",
  "0000ff02-0000-1000-8000-00805f9b34fb",
  "0000ae01-0000-1000-8000-00805f9b34fb",
  "bef8d6c9-9c21-4c9e-b632-bd58c1009f9f",
]

function getNavigatorBluetooth(): BluetoothLike | null {
  if (typeof window === "undefined" || typeof navigator === "undefined") return null

  const nav = navigator as Navigator & {
    bluetooth?: BluetoothLike
  }

  return nav.bluetooth ?? null
}

function assertBluetoothAvailable(): BluetoothLike {
  const bluetooth = getNavigatorBluetooth()

  if (!bluetooth) {
    throw new Error("Bluetooth no disponible en este navegador")
  }

  return bluetooth
}

function toPlainArrayBuffer(data: Uint8Array): ArrayBuffer {
  const out = new ArrayBuffer(data.byteLength)
  new Uint8Array(out).set(data)
  return out
}

function normalizeUuid(uuid: BluetoothServiceUUIDLike | BluetoothCharacteristicUUIDLike) {
  return String(uuid).toLowerCase()
}

function isWritableCharacteristic(characteristic: BluetoothCharacteristicLike) {
  return !!(
    characteristic.properties.write || characteristic.properties.writeWithoutResponse
  )
}

async function getWritableCharacteristicFromService(
  service: BluetoothServiceLike,
  characteristicCandidates: BluetoothCharacteristicUUIDLike[]
): Promise<{
  characteristic: BluetoothCharacteristicLike
  characteristicId?: BluetoothCharacteristicUUIDLike
}> {
  for (const charId of characteristicCandidates) {
    try {
      const characteristic = await service.getCharacteristic(charId)

      if (isWritableCharacteristic(characteristic)) {
        return {
          characteristic,
          characteristicId: charId,
        }
      }
    } catch {
      // seguir
    }
  }

  const all = await service.getCharacteristics()
  const writable = all.find((characteristic) => isWritableCharacteristic(characteristic))

  if (writable) {
    return {
      characteristic: writable,
      characteristicId: writable.uuid,
    }
  }

  throw new Error("No encontré una characteristic escribible en este service")
}

async function getWritableCharacteristic(
  server: BluetoothServerLike,
  serviceCandidates: BluetoothServiceUUIDLike[],
  characteristicCandidates: BluetoothCharacteristicUUIDLike[]
): Promise<{
  characteristic: BluetoothCharacteristicLike
  serviceId?: BluetoothServiceUUIDLike
  characteristicId?: BluetoothCharacteristicUUIDLike
}> {
  const triedServices: string[] = []

  for (const serviceId of serviceCandidates) {
    try {
      const service = await server.getPrimaryService(serviceId)
      const result = await getWritableCharacteristicFromService(
        service,
        characteristicCandidates
      )

      return {
        characteristic: result.characteristic,
        serviceId,
        characteristicId: result.characteristicId,
      }
    } catch {
      triedServices.push(normalizeUuid(serviceId))
    }
  }

  throw new Error(
    `No encontré una characteristic de escritura para la impresora. Services probados: ${triedServices.join(", ")}`
  )
}

export async function connectBlePrinter(): Promise<PrinterConnection> {
  const bluetooth = assertBluetoothAvailable()

  const device = await bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: DEFAULT_SERVICE_CANDIDATES,
  })

  const server = await device.gatt?.connect()

  if (!server) {
    throw new Error("No se pudo abrir conexión Bluetooth")
  }

  try {
    const result = await getWritableCharacteristic(
      server,
      DEFAULT_SERVICE_CANDIDATES,
      DEFAULT_CHARACTERISTIC_CANDIDATES
    )

    return {
      device,
      characteristic: result.characteristic,
      serviceId: result.serviceId,
      characteristicId: result.characteristicId,
    }
  } catch (error) {
    try {
      device.gatt?.disconnect()
    } catch {
      // nada
    }

    const deviceName = device.name?.trim() || "sin nombre"
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo detectar un canal de escritura"

    throw new Error(
      `La impresora "${deviceName}" no parece compatible con esta conexión BLE. ${message}`
    )
  }
}

async function writeChunk(
  characteristic: BluetoothCharacteristicLike,
  chunk: Uint8Array
) {
  const payload = toPlainArrayBuffer(chunk)

  if (
    characteristic.properties.writeWithoutResponse &&
    characteristic.writeValueWithoutResponse
  ) {
    await characteristic.writeValueWithoutResponse(payload)
    return
  }

  if (characteristic.properties.write && characteristic.writeValue) {
    await characteristic.writeValue(payload)
    return
  }

  if (characteristic.writeValue) {
    await characteristic.writeValue(payload)
    return
  }

  if (characteristic.writeValueWithoutResponse) {
    await characteristic.writeValueWithoutResponse(payload)
    return
  }

  throw new Error("La characteristic no permite escritura")
}

export async function writeEscPos(
  characteristic: BluetoothCharacteristicLike,
  bytes: Uint8Array,
  chunkSize = 180,
  delayMs = 30
) {
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.slice(i, i + chunkSize)
    await writeChunk(characteristic, chunk)

    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }
}

export async function disconnectBlePrinter(device: BluetoothDeviceLike) {
  try {
    device.gatt?.disconnect()
  } catch {
    // nada
  }
}