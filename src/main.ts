import assert from 'assert'
import { args } from './args.js'
import * as midi from './midi/midiio.js'
import { Pad48Settings, readParams, writeParams } from './midi/worlde.js'
import { readFile, writeFile } from 'fs/promises'

async function read(device: midi.Device, fileName: string) {
  const params = await readParams(device)

  await writeFile(fileName, JSON.stringify(params, null, 4))
}

async function write(device: midi.Device, fileName: string, bank: number) {
  const json = await readFile(fileName)
  const padConfig: Pad48Settings = JSON.parse(json.toString())

  writeParams(device, padConfig, bank)
}

async function main() {
  const devices = midi.getDevices()

  if (!args.fromPad && !args.toPad) {
    console.log(`Devices:`)
    for (const device of devices) console.log(`"${device}"`)
    return
  }

  const deviceName = args.device ? args.device : devices.length === 1 ? devices[0] : undefined
  assert(deviceName && devices.includes(deviceName), `Cannot find device`)
  const device = midi.openDevice(deviceName)

  if (args.fromPad) {
    console.log(`copy pad config to ${args.fromPad}`)
    await read(device, args.fromPad)
  }

  if (args.toPad) {
    const bank = args.bank ? `bank ${args.bank}` : 'working area'
    console.log(`copy ${args.toPad} to pad ${bank}`)
    await write(device, args.toPad, args.bank ?? 0)
  }

  console.log('done')
  device.close()
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e)
    process.exit(1)
  }
)
