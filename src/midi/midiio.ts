import assert from 'assert'
import * as easymidi from 'easymidi'
import _ from 'lodash'
import events from 'node:events'

enum SysEx {
  Start = 0xf0,
  Terminator = 0xf7
}

namespace Manufacturers {
  export const Arturia = [0x00, 0x20, 0x6b]
}

enum DeviceId {
  Broadcast = 0x7f
}

export interface ParamAddress {
  param: number
  addr: number
  bank?: number
}
export class Device {
  cancelReadSettings = 'cancelReadSettings'
  readSettingsAnswer = 'readSettingsAnswer'
  private sysex = new events.EventEmitter()

  constructor(private input: easymidi.Input, private output: easymidi.Output) {
    input.on('sysex', (p) => {
      let bufIdx = 0
      if (p.bytes[bufIdx++] == SysEx.Start) {
        const manufacturer = [p.bytes[bufIdx++]]
        if (!manufacturer[0]) {
          manufacturer.push(p.bytes[bufIdx++])
          manufacturer.push(p.bytes[bufIdx++])
        }
        const deviceId = p.bytes[bufIdx++]
        //read settings answer
        if (p.bytes[bufIdx + 0] == 0x42 && p.bytes[bufIdx + 1] == 2) this.sysex.emit(this.readSettingsAnswer, p.bytes.slice(bufIdx + 2))
      }
    })
  }

  close() {
    this.input.close()
    this.output.close()
  }

  async getParam(addr: ParamAddress) {
    const bank = 0 //ingore argument
    const out = [SysEx.Start, Manufacturers.Arturia, DeviceId.Broadcast, 0x42, 0x01, bank, addr.param, addr.addr, SysEx.Terminator]
    this.output.send('sysex', _.flatten(out))
    const tHandle = setTimeout(() => this.sysex.emit(this.readSettingsAnswer, this.cancelReadSettings), 100)
    for (;;) {
      const [data] = await events.once(this.sysex, this.readSettingsAnswer)
      if (data === this.cancelReadSettings) return undefined

      if (data[0] === bank && data[1] === addr.param && data[2] === addr.addr) {
        clearTimeout(tHandle)
        return data[3]
      }
    }
  }

  setParam(addr: ParamAddress, value: number) {
    this.output.send(
      'sysex',
      _.flatten([
        SysEx.Start,
        Manufacturers.Arturia,
        DeviceId.Broadcast,
        0x42,
        0x02,
        addr.bank ?? 0,
        addr.param,
        addr.addr,
        value,
        SysEx.Terminator
      ])
    )
  }
}

export function getDevices() {
  const inputs = easymidi.getInputs()
  const outputs = easymidi.getOutputs()

  return _.intersection(inputs, outputs)
}

export function openDevice(dev: string): Device {
  const input = new easymidi.Input(dev)
  const output = new easymidi.Output(dev)
  assert(input.isPortOpen() && output.isPortOpen())
  return new Device(input, output)
}
