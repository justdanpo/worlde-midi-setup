# About
Worlde Orca Pad48 setup utility.

# Command line arguments examples
### Display devices list:
`npm run start --`

### Save working area configuration to file
`npm run start -- --fromPad filename.json`

### Write configuratoin to working area
`npm run start -- --toPad examples/scale-c-minor-up.json`

### Write configuratoin to specified bank
`npm run start -- --toPad examples/scale-c-minor-up.json --bank 2`

(allowed banks: 1...4)

Parameter writes are spaced 10 ms apart to give the controller time to process
each setting. The utility does not receive per-parameter write acknowledgements,
so read the settings back with `--fromPad` to verify them after writing.

Read settings include `rawBytes` and `rawMode` for each control so unsupported
mode and channel encodings can be inspected. Unknown mode encodings are reported
as `unknown` rather than `off`, and are preserved when writing a readback file.
