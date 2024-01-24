import { TTSAudio } from "./index";

export interface HandleMessageOption {
  /** 索引 */
  index: number;
  /** 文字标记，1-3个不等的文字 */
  text: string;
  /** 该文字所在时长偏移 */
  offset: number;
  /** 文字朗读持续时间 */
  duration: number;
  /** Offset + Duration */
  time: number;
  /** 当前朗读的SSML */
  ssml: string;
}

export interface TTSCoreOption {
  /** 和后台建立 socket 连接响应超时时间 */
  timeout: number;
  /** 全局朗读角色配置 */
  roleVoice: RoleVoice;
  /** 消息监听 */
  onMessage: (option: HandleMessageOption) => void;
}

export interface TTSCoreDataResult {
  buffers: ArrayBuffer;
  // blob: Blob;
  audio: TTSAudio;
}

export interface HandlePlayOption {
  audioContext: AudioContext;
  audioSource: AudioBufferSourceNode;
  buffer: AudioBuffer;
  text: string;
  start_index: number;
  end_index: number;
  onStop: Function;
}

export interface TTSSpeakLongTextOption {
  /** 全局朗读角色配置 */
  roleVoice: RoleVoice;
  /** 消息监听 */
  onPlay: (option: HandlePlayOption) => void;
}

export interface TTSSpeakOption {
  /** 全局朗读角色配置 */
  roleVoice: RoleVoice;
}

/** Srt字幕 */
export interface Srt {
  index: number;
  start: string;
  end: string;
  text: string;
}

/** 朗读角色名称 */
export enum VoiceNameEnum {
  "晓晓 - 新闻、小说" = "Microsoft Server Speech Text to Speech Voice (zh-CN, XiaoxiaoNeural)",
  "晓伊 - 卡通、小说" = "Microsoft Server Speech Text to Speech Voice (zh-CN, XiaoyiNeural)",
  "云健 - 运动、小说" = "Microsoft Server Speech Text to Speech Voice (zh-CN, YunjianNeural)",
  "云希 - 小说" = "Microsoft Server Speech Text to Speech Voice (zh-CN, YunxiNeural)",
  "云夏 - 卡通、小说" = "Microsoft Server Speech Text to Speech Voice (zh-CN, YunxiaNeural)",
  "云扬 - 新闻" = "Microsoft Server Speech Text to Speech Voice (zh-CN, YunyangNeural)",
  "辽林 - 方言小贝" = "Microsoft Server Speech Text to Speech Voice (zh-CN-liaoning, XiaobeiNeural)",
  "陕西 - 方言小倪" = "Microsoft Server Speech Text to Speech Voice (zh-CN-shaanxi, XiaoniNeural)",
  "晓晓" = "Microsoft Server Speech Text to Speech Voice (zh-CN, XiaoxiaoNeural)",
  "晓伊" = "Microsoft Server Speech Text to Speech Voice (zh-CN, XiaoyiNeural)",
  "云健" = "Microsoft Server Speech Text to Speech Voice (zh-CN, YunjianNeural)",
  "云希" = "Microsoft Server Speech Text to Speech Voice (zh-CN, YunxiNeural)",
  "云夏" = "Microsoft Server Speech Text to Speech Voice (zh-CN, YunxiaNeural)",
  "云扬" = "Microsoft Server Speech Text to Speech Voice (zh-CN, YunyangNeural)",
  "辽林" = "Microsoft Server Speech Text to Speech Voice (zh-CN-liaoning, XiaobeiNeural)",
  "陕西" = "Microsoft Server Speech Text to Speech Voice (zh-CN-shaanxi, XiaoniNeural)",
}

/** 朗读角色用户配置 */
export interface RoleVoice {
  /** 播音角色 */
  name: string;
  /** 语速 */
  rate: number;

  /** 试听文本 */
  text?: string;
}

export type RoleVoiceContent = Partial<RoleVoice> & { content: string };

/** 朗读角色详细配置 */
export interface Voice {
  [x: string]: any;
  /** 友好名称 */
  FriendlyName: string;
  /** 名称 */
  Name: string;
  /** 简短名称 */
  ShortName: string;
  /** 性别 */
  Gender: "Female" | "Male";
  /** 区域设置 */
  Locale: string;
  /** 状态 */
  Status: string;
  /** 建议的编解码器 */
  SuggestedCodec: string;
  /** 语音标签 */
  VoiceTag: {
    /** 内容类别 */
    ContentCategories: string[];
    /** 语音个性 */
    VoicePersonalities: string[];
  };
}
