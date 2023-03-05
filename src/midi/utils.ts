import _ from "lodash";

export function toPaddedHex(value: number, len: number) {
  return  _.padStart(value.toString(16), len, '0')
}
