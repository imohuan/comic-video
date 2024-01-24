import { request } from "./request";
import { arrayBufferToAudioBuffer, audioBufferToWav, mergeArrayBuffers } from "./audio";
import { DEFAULT_VOICE, SSML_ROLE, SSML_ROOT, VOICE_LIST } from "./config";
import { RoleVoice, RoleVoiceContent, Srt, TTSCoreDataResult, TTSCoreOption, TTSSpeakLongTextOption, TTSSpeakOption, Voice } from "./interface";
import { defaultsDeep, get } from "lodash-es";

class TtsUtils {
  /** 获取 UUID */
  getUuid() {
    return "ce85b028cbccebfc8a84d38dda106db7".replace(/[a-z0-9]/g, (c) => {
      const r = (Math.random() * 16) | 0,
        v = c == "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * 替换字符串中的变量 {var}
   * @param text 字符串
   * @param data 替换变量的对象
   * @param regexp 自定义正则匹配变量 默认 `/\{([a-zA-Z0-9]+)\}/g => {var}`
   */
  textVarReplace(text: string, data: any = {}, regexp = /\{([a-zA-Z0-9]+)\}/g) {
    return text.replace(regexp, (_, name) => get(data, name, name));
  }

  /**
   * 合并多个 arrayBuffers 对象
   * @param arrayBuffers
   * @returns 合并后的单独arrayBuffers对象
   */
  mergeArrayBuffers(arrayBuffers: any) {
    const totalLength = arrayBuffers.reduce((length: any, buffer: any) => length + buffer.byteLength, 0);
    const mergedBuffer = new ArrayBuffer(totalLength);
    const mergedUint8Array = new Uint8Array(mergedBuffer);
    let offset = 0;
    arrayBuffers.forEach((buffer: any) => {
      const uint8Array = new Uint8Array(buffer);
      mergedUint8Array.set(uint8Array, offset);
      offset += buffer.byteLength;
    });
    return mergedBuffer;
  }

  /**
   * 将 arrayBuffers 转换为 Blob 对象
   * @param arrayBuffers
   * @returns Blob对象
   */
  arrayBufferToBlob(arrayBuffers: any) {
    return new Blob(arrayBuffers, { type: "application/octet-stream" });
  }

  /**
   * 将 blob 转换为 arrayBuffers 对象
   * @param blob
   * @returns arrayBuffers 对象
   */
  blobToArrayBuffer(blob: Blob) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsArrayBuffer(blob);
      reader.onloadend = function () {
        const buffers: any = reader.result;
        resolve(buffers);
      };
    });
  }

  /** 将Edge输出的时间转为 hh:mm:ss,ssss */
  convertNumberToTime(num: number) {
    const seconds = num / (10 * 1000 * 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds - Math.floor(seconds)) * 1000);
    const timeString =
      (hours < 10 ? "0" + hours : hours) +
      ":" +
      (minutes < 10 ? "0" + minutes : minutes) +
      ":" +
      (remainingSeconds < 10 ? "0" + remainingSeconds : remainingSeconds) +
      "," +
      (milliseconds < 10 ? "00" + milliseconds : milliseconds < 100 ? "0" + milliseconds : milliseconds);
    return timeString;
  }
}

export class TTS {
  voiceMap: Record<string, Voice[]>;
  private utils: TtsUtils = new TtsUtils();

  constructor() {
    this.voiceMap = this.voiceToMap(VOICE_LIST);
  }

  /** Voice list 转换为 { [Local]: Voice } */
  private voiceToMap(voices: Voice[]): Record<string, Voice[]> {
    return voices.reduce((acc, voice) => {
      if (acc.hasOwnProperty(voice.Locale)) acc[voice.Locale].push(voice);
      else acc[voice.Locale] = [voice];
      return acc;
    }, {} as Record<string, Voice[]>);
  }

  /** 将文本转为SSML，如果是SSML直接返回 */
  private textToSsml(textOrSsml: string, roleVoice: RoleVoice): string {
    let ssml = textOrSsml.trim();
    if (!ssml.startsWith("<")) {
      const ssml_role = this.utils.textVarReplace(SSML_ROLE, { ...roleVoice, text: ssml });
      ssml = this.utils.textVarReplace(SSML_ROOT, { voice: ssml_role });
    }
    return ssml;
  }

  /**
   * 分割文本，按照指定段落最大数量
   * @param text 待分割文本
   * @param max_length 最大文本内容
   * @returns
   */
  private textSplit(text: string, max_length: number = 1000): string[] {
    const texts = text
      .split(/\n|。|，|\?|\,|\.|\!|？|！/)
      .filter((f) => f.trim())
      .map((f) => f.trim() + "，");
    let current: string = "";
    const result = texts.reduce((pre, cur) => {
      if ((current + cur).length < max_length) {
        current += cur;
      } else {
        pre.push(current);
        current = cur;
      }
      if (cur === texts[texts.length - 1]) pre.push(current);
      return pre;
    }, [] as string[]);
    return result;
  }

  /** 获取朗读角色详细列表 */
  async getVoiceList(local: boolean = true): Promise<Record<string, Voice[]>> {
    if (local) return this.voiceMap;
    return request("https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/voices/list?trustedclienttoken=6A5AA1D4EAFF4E9FB37E23D68491D6F4").then((res) =>
      this.voiceToMap(res)
    );
  }

  /** 将SSML转为音频（buffers, blob） */
  private core(textOrSsml: string, _option: Partial<TTSCoreOption> = {}): Promise<{ error: any; data: TTSCoreDataResult | null }> {
    const option: TTSCoreOption = defaultsDeep(_option, {
      timeout: 30 * 1000,
      roleVoice: DEFAULT_VOICE,
      onMessage: () => {},
    } as Partial<TTSCoreOption>);
    const { timeout, roleVoice, onMessage } = option;
    const ssml = this.textToSsml(textOrSsml, roleVoice);
    return new Promise((resolve) => {
      let timer: any;
      const arrayBuffers: any[] = [];
      const TrustedClientToken = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
      const ConnectionId = this.utils.getUuid();
      const query = new URLSearchParams({ TrustedClientToken, ConnectionId }).toString();
      const uri = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?${query}`;
      const socket = new WebSocket(uri);
      socket.binaryType = "arraybuffer";

      const option = {
        context: {
          synthesis: {
            audio: {
              metadataoptions: { sentenceBoundaryEnabled: "false", wordBoundaryEnabled: "true" },
              outputFormat: "webm-24khz-16bit-mono-opus",
            },
          },
        },
      };
      const str_option = JSON.stringify(option);
      const message1 = `X-Timestamp:${new Date()}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n${str_option}`;
      const message2 = `X-RequestId:${this.utils.getUuid()}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${new Date()}\r\nPath:ssml\r\n\r\n${ssml}`;

      const close = () => {
        if (socket && socket.readyState == 1) {
          socket.send(new ArrayBuffer(0));
          socket.close();
          resolve({ error: new Error("意外停止"), data: null });
        }
      };

      const set_timer = () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => close(), timeout);
      };

      socket.onopen = () => {
        socket.send(message1);
        socket.send(message2);
        set_timer();
      };
      socket.onerror = (e) => resolve({ error: e, data: null });
      socket.onclose = (e) => resolve({ error: e, data: null });

      let index = 0;
      socket.onmessage = (e) => {
        set_timer();
        if (e.data instanceof ArrayBuffer) {
          const dataView = new DataView(e.data);
          const offset = dataView.getInt16(0);
          if (e.data.byteLength < offset + 2) throw new Error("Invalid binary message format. Header content missing.");
          for (var l = "", f = 0; f < offset; f++) l += String.fromCharCode(dataView.getInt8(f + 2));
          if (e.data.byteLength > offset + 2) arrayBuffers.push(e.data.slice(2 + offset));
        } else {
          if (e.data.indexOf("turn.end") !== -1) {
            // arrayBuffers: [ArrayBuffer(28), ArrayBuffer(300), ...] 所以将其合并为一个Blob对象
            arrayBufferToAudioBuffer(mergeArrayBuffers(arrayBuffers)).then((audioBuffer) => {
              const buffers = audioBufferToWav(audioBuffer);
              resolve({ error: false, data: { buffers, audio: new TTSAudio(buffers) } });
            });
            // const blob = this.utils.arrayBufferToBlob(arrayBuffers);
            // this.utils.blobToArrayBuffer(blob).then((buffers: any) => {
            //   resolve({ error: false, data: { buffers, blob, audio: new TTSAudio(buffers) } });
            // });
          } else {
            const json = JSON.parse(e.data.split("\r\n\r\n")[1]);
            if (json?.Metadata && json.Metadata[0].Type === "WordBoundary") {
              const {
                Duration,
                Offset,
                text: { Text },
              } = json.Metadata[0].Data;
              index++;
              onMessage({ index, text: Text, offset: Offset, duration: Duration, time: Offset + Duration, ssml });
            }
          }
        }
      };
    });
  }

  /** 批量操作SSML */
  private async batchSsml(ssmlList: string[]): Promise<TTSCoreDataResult> {
    const srt: Srt[] = [];
    const defaultSrt = { text: "", start: "", end: "", index: 0 };
    let oldTime = 0;
    let current_srt: Srt = { ...defaultSrt };
    const onEnd = () => {
      if (current_srt.text.trim()) srt.push(current_srt);
      const srt_text = srt.map((m) => `${m.index}\n${m.start} --> ${m.end}\n${m.text}`).join("\n\n");
      console.log("srt_text", srt_text);
    };

    const onMessage = (data: any) => {
      const { text, offset, time } = data;
      // index, ssml
      // TODO: 批量SSML的时候，onMessage接收的是所有消息，因此这里需要通过Index，SSMl来判断，或者将onMessage修改为私用，在 tts(ssml, { onMessage: () => {...}})
      if (!current_srt.start.trim()) current_srt.start = this.utils.convertNumberToTime(offset);
      current_srt.end = this.utils.convertNumberToTime(oldTime);
      if (oldTime !== 0 && offset - oldTime > 1000000) {
        if (!current_srt.text.trim()) current_srt.text = text;
        srt.push(current_srt);
        current_srt = {
          ...defaultSrt,
          text,
          start: this.utils.convertNumberToTime(offset),
          index: current_srt.index + 1,
        };
      } else current_srt.text = current_srt.text + text;
      oldTime = time;
    };

    return Promise.all(ssmlList.map((ssml) => this.core(ssml, { onMessage }))).then((res) => {
      onEnd();
      const buffers = this.utils.mergeArrayBuffers(res.map((m) => m.data?.buffers).filter((f) => f));
      const blob = this.utils.arrayBufferToBlob([buffers]);
      return { buffers, blob, audio: new TTSAudio(buffers) };
    });
  }

  /**
   * SSML进行多次配音，要求符合SSML规则 speak.voice[10].prosody.朗读内容， voice可为多个，每个voice中只能出现一个prosody，不允许出现其他的节点
   * @param textOrSsml
   * @param _option
   */
  speak(textOrSsml: string, _option: Partial<TTSSpeakOption> = {}) {
    const option: TTSSpeakOption = defaultsDeep(_option, {
      roleVoice: DEFAULT_VOICE,
    } as Partial<TTSSpeakOption>);
    const { roleVoice } = option;
    const ssml = this.textToSsml(textOrSsml, roleVoice);

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(ssml, "text/xml");

    const roleList: RoleVoiceContent[] = [];
    const oVoiceList: any[] = Array.from(xmlDoc.querySelector("speak")?.childNodes || []);

    oVoiceList.forEach((oVoice: HTMLElement) => {
      const text: string = oVoice.textContent?.trim() || "";
      if (!text.trim()) return;
      const oProsody = oVoice.querySelector("prosody");
      const roleVoiceContent: RoleVoiceContent = defaultsDeep({ name: oVoice.getAttribute("name"), rate: oProsody?.getAttribute("rate"), content: text }, roleVoice);
      roleList.push(roleVoiceContent);
    });

    return this.speakArray(roleList);
  }

  speakArray(roleList: RoleVoiceContent[]) {
    const maxLength = 1000;
    const ssmlList = roleList.map((role) => {
      if (role.content.length <= maxLength) return this.textToSsml(role.content, defaultsDeep(role, DEFAULT_VOICE));
      const contents = this.textSplit(role.content, maxLength);
      return contents.map((content) => this.textToSsml(content, defaultsDeep(role, DEFAULT_VOICE)));
    });
    return this.batchSsml(ssmlList.flat());
  }

  async speakLongText(text: string, _option: Partial<TTSSpeakLongTextOption> = {}) {
    const option: TTSSpeakLongTextOption = defaultsDeep(_option, {
      roleVoice: DEFAULT_VOICE,
      onPlay: () => {},
    } as TTSSpeakLongTextOption);
    const { roleVoice, onPlay } = option;

    let start_index = 0;
    let end_index = 0;

    let loading = false;
    let current_text = "";
    let current_buffers: any;
    let current_audioContext: AudioBufferSourceNode;

    let load_timer: any;
    let play_timer: any;
    const text_list = this.textSplit(text, 50);

    const ready = async () => {
      return new Promise((resolve) => {
        let timer: any;
        const start = () => {
          timer = setTimeout(() => {
            if (!loading) {
              clearTimeout(timer);
              resolve(true);
            } else start();
          }, 100);
        };
        start();
      });
    };

    const onStop = () => {
      current_audioContext.stop();
      if (load_timer) clearTimeout(load_timer);
      if (play_timer) clearTimeout(play_timer);
    };

    const play_voice = async () => {
      if (loading) await ready();
      if (current_buffers.byteLength === 0) return;
      const audioContext = new AudioContext();
      const gainNode = audioContext.createGain();
      const audioSource = audioContext.createBufferSource();
      audioSource.connect(gainNode);
      gainNode.gain.value = 0.5;
      gainNode.connect(audioContext.destination);
      // 在之前音频结束后在进行播放会导致音频卡顿，因为播放的时候需要加载需要0.几秒
      // audioSource.addEventListener("ended", () => onPlay());

      const computePause = () => {
        if (roleVoice.rate < 1) return (1 + roleVoice.rate) * 0.7;
        else if (roleVoice.rate === 1) return 0.7;
        else return (roleVoice.rate - 1) * 0.7;
      };

      audioContext.decodeAudioData(current_buffers, (buffer) => {
        onPlay({ audioContext, audioSource, buffer, text: current_text, start_index, end_index, onStop });
        start_index = end_index;
        current_audioContext = audioSource;
        audioSource.buffer = buffer;
        audioSource.start();
        load_timer = setTimeout(() => load_voice(), (buffer.duration - 5) * 1000);
        play_timer = setTimeout(() => play_voice(), (buffer.duration - computePause()) * 1000);
      });
    };

    const load_voice = async (retry = 3): Promise<any> => {
      if (text_list.length === 0) return;
      loading = true;
      current_text = text_list.shift()!;
      end_index += current_text.length;
      console.log("预加载音频: ", current_text);
      const { error, data } = await this.core(current_text, { roleVoice });
      console.log("data", data);
      loading = false;
      if (error) {
        console.log("tts 播放长文本 加载音频失败: ", error);
        if (retry > 1) return await load_voice(retry - 1);
        return;
      }
      current_buffers = data!.buffers;
    };

    await load_voice();
    await play_voice();

    return { onStop, text_list };
  }
}

export class TTSAudio {
  private audioContext: AudioContext;
  private audioSource: AudioBufferSourceNode;

  constructor(private buffers: ArrayBuffer) {
    const { audioContext, audioSource } = this.create();
    this.audioContext = audioContext;
    this.audioSource = audioSource;
  }

  create() {
    const audioContext = new AudioContext();
    const gainNode = audioContext.createGain();
    const audioSource = audioContext.createBufferSource();
    audioSource.connect(gainNode);
    gainNode.gain.value = 0.5;
    gainNode.connect(audioContext.destination);
    audioContext.decodeAudioData(this.buffers.slice(0), (buffer) => {
      audioSource.buffer = buffer;
    });
    return { audioContext, audioSource };
  }

  play() {
    const state = this.audioContext.state;
    if (state === "suspended") this.audioContext.resume();
    if (state === "running") this.audioSource.start();
    if (state === "closed") {
      const { audioContext, audioSource } = this.create();
      this.audioContext = audioContext;
      this.audioSource = audioSource;
      this.audioSource.start();
    }
  }

  pause() {
    if (this.audioContext.state === "running") this.audioContext.suspend();
  }

  stop() {
    this.audioSource.stop();
    this.audioContext.close();
  }

  getObjectURL() {
    const audioBlob = new Blob([this.buffers], { type: "audio/mpeg" });
    return URL.createObjectURL(audioBlob);
  }

  download(name = "合成音频.mp3") {
    const url = this.getObjectURL();
    const el = document.createElement("a");
    el.setAttribute("href", url);
    el.setAttribute("download", name);
    el.style.display = "none";
    document.body.appendChild(el);
    el.click();
    document.body.removeChild(el);
    URL.revokeObjectURL(url);
  }

  addEventListener(type: "ended" = "ended", listener: (this: AudioBufferSourceNode, ev: Event) => any) {
    this.audioSource.addEventListener(type, listener);
  }
}
