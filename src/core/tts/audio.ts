// toWav.js
/** audioBuffer 转wav
 * @param {audioBuffer} samples 音频样本
 * @param {Object} opt={} 配置项 outputRate采样率 bitDepth位深 numChannels声道数
 */

interface AudioBufferToWavOption {
  outputRate: number;
  bitDepth: number;
  numChannels: number;
}

/**
 * 合并多个ArrayBuffer
 * @param arrayBufferList ArrayBuffer列表
 * @returns 合并的ArrayBuffer
 */
export function mergeArrayBuffers(arrayBufferList: ArrayBuffer[]): ArrayBuffer {
  // 创建一个空的 Uint8Array 来存储合并后的数据
  let mergedUint8Array = new Uint8Array(0);
  // 遍历 arrayBufferList
  for (let i = 0; i < arrayBufferList.length; i++) {
    // 将当前 ArrayBuffer 转换为 Uint8Array
    let uint8Array = new Uint8Array(arrayBufferList[i]);
    // 创建一个新的 Uint8Array 来存储合并后的数据
    let newMergedUint8Array = new Uint8Array(mergedUint8Array.length + uint8Array.length);
    // 复制前一部分数据到新的 Uint8Array 中
    newMergedUint8Array.set(mergedUint8Array, 0);
    // 复制当前 ArrayBuffer 的数据到新的 Uint8Array 中
    newMergedUint8Array.set(uint8Array, mergedUint8Array.length);
    // 更新合并后的 Uint8Array
    mergedUint8Array = newMergedUint8Array;
  }
  // 返回合并后的 ArrayBuffer
  return mergedUint8Array.buffer;
}

/** ArrayBuffer转为 AudioBuffer */
export function arrayBufferToAudioBuffer(arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
  return new Promise((resolve) => {
    const audioContext = new AudioContext();
    const audioSource = audioContext.createBufferSource();
    audioContext.decodeAudioData(arrayBuffer, (_buffer) => {
      audioSource.buffer = _buffer;
      audioSource.connect(audioContext.destination);
      resolve(trimSilence(_buffer));
    });
  });
}

/** AudioBuffer压缩并且添加头部信息转为 ArrayBuffer */
export function audioBufferToWav(samples: AudioBuffer, opt: Partial<AudioBufferToWavOption> = {}): ArrayBuffer {
  const outputRate = opt.outputRate || 24000; // 指定输出采样率
  const bitDepth = opt.bitDepth || 16; // 指定位数
  const numChannels = opt.numChannels || samples.numberOfChannels; // 指定声道数
  const times = (samples.sampleRate / outputRate) >> 0; // 计算压缩率
  // 采样率压缩核心实现在这一步
  const interleaved =
    numChannels === 2
      ? interleave(times, samples.getChannelData(0), samples.getChannelData(1))
      : interleave(times, samples.getChannelData(0));
  return encodeWAV(interleaved, outputRate, bitDepth, numChannels);
}

/** 删除空白部分 */
export function trimSilence(audioBuffer: AudioBuffer) {
  const audioContext = new AudioContext();
  const bufferLength = audioBuffer.length;
  const channelData = audioBuffer.getChannelData(0);
  const threshold = 0.01; // 静默阈值，根据音频文件的实际情况进行调整

  let startIndex = 0;
  let endIndex = bufferLength;

  // 寻找开始索引
  for (let i = 0; i < bufferLength; i++) {
    if (Math.abs(channelData[i]) > threshold) {
      startIndex = i;
      break;
    }
  }

  // 寻找结束索引
  for (let i = bufferLength - 1; i >= startIndex; i--) {
    if (Math.abs(channelData[i]) > threshold) {
      endIndex = i;
      break;
    }
  }

  // 创建新的音频缓冲区
  const newBuffer = audioContext.createBuffer(
    audioBuffer.numberOfChannels,
    endIndex - startIndex,
    audioBuffer.sampleRate
  );

  // 复制非静默部分到新的缓冲区
  for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
    const channelData = audioBuffer.getChannelData(channel);
    const newChannelData = newBuffer.getChannelData(channel);
    for (let i = startIndex; i < endIndex; i++) {
      newChannelData[i - startIndex] = channelData[i];
    }
  }

  return newBuffer;
}

/** 压缩采样率
 * @params {Number} times 压缩率
 * @params {Float32Array} inputL 左声道
 * @params {Float32Array} inputR 右声道
 */
function interleave(times: number, inputL: Float32Array, inputR?: Float32Array) {
  // 计算压缩后的数据长度
  const length = inputR ? ((inputL.length + inputR.length) / times) >> 0 : (inputL.length / times) >> 0;
  const result = new Float32Array(length);
  let index = 0,
    inputIndex = 0;
  while (index < length) {
    result[index++] = inputL[inputIndex];
    if (inputR) result[index++] = inputR[inputIndex];
    inputIndex += times; // 每次跳过压缩率的倍数
  }
  return result;
}

/** buffer转wav
 * @params {audioBuffer} samples 样本
 * @params {Number} outputRate 采样率
 * @params {Number} bitDepth 位深 8 16 32
 * @params {Number} numChannels 声道数
 */
function encodeWAV(samples: Float32Array, outputRate: number, bitDepth: number, numChannels: number) {
  const bytesPerSample = bitDepth / 8; // 字节
  const blockAlign = numChannels * bytesPerSample; // 采样一次占用字节数
  const len = samples.length * bytesPerSample; // 样本长度
  const buffer = new ArrayBuffer(44 + len); // 有44字节是头部文件
  const view = new DataView(buffer);
  /* 资源交换文件标识符 */
  writeString(view, 0, "RIFF");
  /* 下个地址开始到文件尾总字节数,即文件大小-8 */
  view.setUint32(4, /*32*/ 36 + len, true);
  /* WAV文件标志 */
  writeString(view, 8, "WAVE");
  /* 波形格式标志 */
  writeString(view, 12, "fmt ");
  /* 过滤字节,一般为 0x10 = 16 */
  view.setUint32(16, 16, true);
  /* 格式类别 (PCM形式采样数据) */
  view.setUint16(20, 1, true);
  /* 通道数 */
  view.setUint16(22, numChannels, true);
  /* 采样率,每秒样本数,表示每个通道的播放速度 */
  view.setUint32(24, outputRate, true);
  /* 波形数据传输率 (每秒平均字节数) 通道数×每秒数据位数×每样本数据位/8 */
  view.setUint32(28, outputRate * blockAlign, true);
  /* 快数据调整数 采样一次占用字节数 通道数×每样本的数据位数/8 */
  view.setUint16(32, blockAlign, true);
  /* 每样本数据位数 */
  view.setUint16(34, bitDepth, true);
  /* 数据标识符 */
  writeString(view, 36, "data");
  /* 采样数据总数,即数据总大小-44 */
  view.setUint32(40, len, true);
  /* 采样数据 */
  if (bitDepth === 8) floatTo8BitPCM(view, 44, samples); // 8位
  else if (bitDepth === 16) floatTo16BitPCM(view, 44, samples); // 16位
  else writeFloat32(view, 44, samples); // 32位
  return buffer;
}

function writeString(view: any, offset: any, string: any) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function floatTo8BitPCM(output: any, offset: any, input: any) {
  for (let i = 0; i < input.length; i++, offset++) {
    //这里只能加1了
    let s = Math.max(-1, Math.min(1, input[i]));
    let val = s < 0 ? s * 0x8000 : s * 0x7fff;
    val = parseInt("" + 255 / (65535 / (val + 32768))); // 有人声的时候会有杂音
    // let val = ((s < 0 ? s * 0x8000 : s * 0x7fff) >> 8) + 128; // 有人声无人声都会有杂音
    output.setInt8(offset, val, true);
  }
}

function floatTo16BitPCM(output: any, offset: any, input: any) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    //因为是int16所以占2个字节,所以偏移量是+2
    let s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
}

function writeFloat32(output: any, offset: any, input: any) {
  for (let i = 0; i < input.length; i++, offset += 4) {
    output.setFloat32(offset, input[i], true);
  }
}
