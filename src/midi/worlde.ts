import _ from 'lodash'
import { Device, ParamAddress } from './midiio.js'
import { toPaddedHex } from './utils.js'

enum Mode {
  off = 'off',
  continuous_absolute = 'continuous_absolute',
  continuous_relative1 = 'continuous_relative1',
  continuous_relative2 = 'continuous_relative2',
  continuous_relative3 = 'continuous_relative3',
  nrpn = 'nrpn',
  rpn = 'rpn',
  mmc = 'mmc',
  switched_toggle = 'switched_toggle',
  switched_gate = 'switched_gate',
  note_toggle = 'note_toggle',
  note_gate = 'note_gate'
}
const ModeToIndex = new Map<Mode, number[]>([
  //Mode:
  // 0 Off - Disabled
  // 1 Continuous (knob/slider/pad)
  // 2 Switched (CC; toggle and gate encodings verified against the ORCA PAD48)
  // 3 MIDI Note (gate encoding verified against the ORCA PAD48 factory configuration)
  // 4 NRPN / RPN (knob)
  // 5 NULL
  // 6 NULL
  // 7 MMC (sysex; pad)
  // 8 Not verified for the ORCA PAD48
  // 9 Not verified for the ORCA PAD48
  // 10 NULL
  // 11 Patch Chg (pad)
  // 12 Pitch Bend (pad)
  // 13 NULL
  // 14 Aftertouch
  //ModeToIndex: [modename as key] => [mode, modeoption]
  [Mode.off, [0, 0]],
  [Mode.continuous_absolute, [1, 0]],
  [Mode.continuous_relative1, [1, 1]],
  [Mode.continuous_relative2, [1, 2]],
  [Mode.continuous_relative3, [1, 3]],
  [Mode.nrpn, [4, 0]],
  [Mode.rpn, [4, 1]],
  [Mode.mmc, [7, 0]],
  [Mode.switched_toggle, [2, 0]],
  [Mode.switched_gate, [2, 1]],
  [Mode.note_toggle, [3, 0]],
  [Mode.note_gate, [3, 1]]
])
function IndexToMode(raw: number[]): Mode | undefined {
  return [...ModeToIndex].find(([, value]) => _.isEqual(value, raw))?.[0]
}

enum Channel {
  C1 = 'channel1',
  C2 = 'channel2',
  C3 = 'channel3',
  C4 = 'channel4',
  C5 = 'channel5',
  C6 = 'channel6',
  C7 = 'channel7',
  C8 = 'channel8',
  C9 = 'channel9',
  C10 = 'channel10',
  C11 = 'channel11',
  C12 = 'channel12',
  C13 = 'channel13',
  C14 = 'channel14',
  C15 = 'channel15',
  C16 = 'channel16',
  Global = 'global'
}
const ChannelToIndex = new Map<Channel, number>([
  [Channel.C1, 0],
  [Channel.C2, 1],
  [Channel.C3, 2],
  [Channel.C4, 3],
  [Channel.C5, 4],
  [Channel.C6, 5],
  [Channel.C7, 6],
  [Channel.C8, 7],
  [Channel.C9, 8],
  [Channel.C10, 9],
  [Channel.C11, 10],
  [Channel.C12, 11],
  [Channel.C13, 12],
  [Channel.C14, 13],
  [Channel.C15, 14],
  [Channel.C16, 15],
  [Channel.Global, 0x41]
])
function IndexToChannel(raw: number): Channel | undefined {
  return [...ChannelToIndex].find(([_, value]) => value === raw)?.[0]
}

enum KnobAccel {
  Slow = 'slow',
  Medium = 'medium',
  Fast = 'fast'
}
const KnobAccelToIndex = new Map<KnobAccel, number>([
  [KnobAccel.Slow, 0],
  [KnobAccel.Medium, 1],
  [KnobAccel.Fast, 2]
])

function IndexToKnob(raw: number) {
  return [...KnobAccelToIndex].find(([_, value]) => value === raw)?.[0] ?? KnobAccel.Slow
}

interface Setting {
  channel: Channel | 'unknown'
  cc: number
  value: number
  minLsb: number
  maxMsb: number
  mode: Mode | 'unknown'
  color?: string
  rawBytes?: number[]
  rawMode?: [number, number]
}
function Setting_toBytes(setting: Setting) {
  const mode =
    setting.mode === 'unknown'
      ? setting.rawMode ?? (setting.rawBytes ? [setting.rawBytes[1], setting.rawBytes[6]] : undefined)
      : ModeToIndex.get(setting.mode)
  if (!mode) throw new Error('Cannot write setting with unknown mode encoding')

  const channel =
    setting.channel === 'unknown'
      ? setting.rawBytes?.[2]
      : ChannelToIndex.get(setting.channel)
  if (channel === undefined) throw new Error('Cannot write setting with unknown channel encoding')

  const out = [setting.value, mode[0], channel, setting.cc, setting.minLsb, setting.maxMsb, mode[1]]

  if (setting.color) {
    const v = parseInt(setting.color, 16)
    out.push((v >> 8) & 255)
    out.push((v >> 16) & 255)
    out.push((v >> 0) & 255)
  }

  return out
}
function Setting_fromBytes(data: number[]): Setting {
  const rawMode: [number, number] = [data[1], data[6]]
  const channel = IndexToChannel(data[2])
  const mode = IndexToMode(rawMode)

  const color = data.length > 7 ? toPaddedHex(data[8], 2) + toPaddedHex(data[7], 2) + toPaddedHex(data[9], 2) : undefined

  return {
    channel: channel ?? 'unknown',
    value: data[0],
    cc: data[3],
    minLsb: data[4],
    maxMsb: data[5],
    mode: mode ?? 'unknown',
    color,
    rawBytes: [...data],
    rawMode
  }
}

interface GlobalSettings {
  channel: Channel
  knobAccel: KnobAccel
}
const GlobalSettingsAddr: ParamAddress[] = [
  { addr: 6, param: 0x40 },
  { addr: 4, param: 0x41 }
  //{ addr: 3, param: 0x41 } pad velocity curve?
]

function GlobalSettings_toBytes(setting: GlobalSettings) {
  return [ChannelToIndex.get(setting.channel) ?? 0, KnobAccelToIndex.get(setting.knobAccel) ?? 0]
}
function GlobalSettings_fromBytes(data: number[]): GlobalSettings {
  return {
    channel: IndexToChannel(data[0]) ?? Channel.C1,
    knobAccel: IndexToKnob(data[1])
  }
}

export interface Pad48Settings {
  knobs: Setting[]
  pads: Setting[]
  sliders: Setting[]
  global: GlobalSettings
}

const KnobAddrs = [0x30, 0x01, 0x02, 0x09, 0x0b, 0x0c, 0x0d, 0x0e]
const PadAddrs = _.range(0x50, 0x80)
const SliderAddrs = [0x33, 0x03, 0x04, 0x0a, 0x05, 0x06, 0x07, 0x08]

async function readBlock(device: Device, addr: number, size: number) {
  const result = []
  for (let param = 0; param < size; param++) {
    result.push(await device.getParam({ addr, param }))
  }
  return result
}

async function writeBlock(device: Device, addr: number, data: number[], bank?: number) {
  for (let param = 0; param < data.length; param++) {
    await device.setParam({ addr, param, bank: bank ?? 0 }, data[param])
  }
}

export async function readParams(device: Device) {
  const r: Pad48Settings = {
    knobs: [],
    pads: [],
    sliders: [],
    global: GlobalSettings_fromBytes([await device.getParam(GlobalSettingsAddr[0]), await device.getParam(GlobalSettingsAddr[1])])
  }

  for (const a of KnobAddrs) r.knobs.push(Setting_fromBytes(await readBlock(device, a, 7)))
  for (const a of PadAddrs) r.pads.push(Setting_fromBytes(await readBlock(device, a, 10)))
  for (const a of SliderAddrs) r.sliders.push(Setting_fromBytes(await readBlock(device, a, 7)))

  return r
}

export async function writeParams(device: Device, settings: Pad48Settings, bank?: number) {
  for (const i in KnobAddrs) await writeBlock(device, KnobAddrs[i], Setting_toBytes(settings.knobs[i]), bank)
  for (const i in PadAddrs) await writeBlock(device, PadAddrs[i], Setting_toBytes(settings.pads[i]), bank)
  for (const i in SliderAddrs) await writeBlock(device, SliderAddrs[i], Setting_toBytes(settings.sliders[i]), bank)
  const global = GlobalSettings_toBytes(settings.global)
  for (const i in global) await device.setParam({ ...GlobalSettingsAddr[i], bank: bank }, global[i])
}
