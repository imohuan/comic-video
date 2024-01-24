import { RoleVoice, Voice, VoiceNameEnum } from "./interface";
import VoiceList from "./voice.json";

/** 默认朗读音频配置 */
export const DEFAULT_VOICE: RoleVoice = {
  name: VoiceNameEnum.云希,
  rate: 1.3
};

export const VOICE_OPTION = [
  { label: "晓晓", value: "Microsoft Server Speech Text to Speech Voice (zh-CN, XiaoxiaoNeural)" },
  { label: "晓伊", value: "Microsoft Server Speech Text to Speech Voice (zh-CN, XiaoyiNeural)" },
  { label: "云健", value: "Microsoft Server Speech Text to Speech Voice (zh-CN, YunjianNeural)" },
  { label: "云希", value: "Microsoft Server Speech Text to Speech Voice (zh-CN, YunxiNeural)" },
  { label: "云夏", value: "Microsoft Server Speech Text to Speech Voice (zh-CN, YunxiaNeural)" },
  { label: "云扬", value: "Microsoft Server Speech Text to Speech Voice (zh-CN, YunyangNeural)" },
  { label: "辽林", value: "Microsoft Server Speech Text to Speech Voice (zh-CN-liaoning, XiaobeiNeural)" },
  { label: "陕西", value: "Microsoft Server Speech Text to Speech Voice (zh-CN-shaanxi, XiaoniNeural)" }
];

/** Voice的Map对象 */
export const VOICE_LIST: Voice[] = VoiceList as any;

/** SSML根节点, 替换 `voice` */
export const SSML_ROOT = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xmlns:mstts='https://www.w3.org/2001/mstts' xml:lang='en-US'>{voice}</speak>`;

/** SSML配音人, 替换 `name`、`rate`、`text` */
export const SSML_ROLE = `<voice name='{name}'><prosody pitch='+0Hz' rate='{rate}' volume='+0%'>{text}</prosody></voice>`;

/**
<speak version='1.0' xmlns = 'http://www.w3.org/2001/10/synthesis' xmlns: mstts = 'https://www.w3.org/2001/mstts' xml: lang = 'en-US' >
  <voice name='{name}'><prosody pitch='+0Hz' rate='1' volume='+0%'></prosody></voice>
</speak> 
 */
