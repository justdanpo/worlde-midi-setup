import { ArgumentConfig, parse, ParseOptions, UsageGuideConfig } from 'ts-command-line-args'

interface Args {
  fromPad?: string
  toPad?: string
  bank?: number
  device?: string
  help?: boolean
}

const argumentConfig: ArgumentConfig<Args> = {
  fromPad: { type: String, optional: true },
  toPad: { type: String, optional: true },
  bank: { type: Number, optional: true },
  device: { type: String, optional: true },
  help: { type: Boolean, optional: true, alias: 'h', description: 'Prints this usage guide' }
}

const parseOptions: ParseOptions<Args> = {
  helpArg: 'help',
  headerContentSections: [{ header: 'copy-files', content: 'Copies files from sourcePath to targetPath' }]
}

const usageGuideInfo: UsageGuideConfig<Args> = {
  arguments: argumentConfig,
  parseOptions
}

export const args: Args = parse(usageGuideInfo.arguments, usageGuideInfo.parseOptions)
