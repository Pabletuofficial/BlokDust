export default class Recorder {
  constructor(source) {
    const context = source.context;
    const processor = context.createScriptProcessor(2048, 1, 1);
    let recording = false;
    let resampleRatio = context.sampleRate / 44100;
    let audioData = {
      sampleRate: 44100,
      channelCount: 1,
      interleaved: true,
      samples: []
    };
    processor.onaudioprocess = function(event) {
      if (!recording) return;
      const inputBuffer = event.inputBuffer;
      const inputData = inputBuffer.getChannelData(0);
      const outputData = new Float32Array(inputBuffer.length / resampleRatio);
      for (let i = 0, o = 0; i < inputData.length; i += resampleRatio, o++) {
        outputData[o] = inputData[i];
      }
      audioData.samples.push(outputData);
    };
    this.start = function() {
      audioData = {
        sampleRate: 44100,
        channelCount: 1,
        interleaved: true,
        samples: []
      };
      recording = true;
    };
    this.stop = function() {
      recording = false;
    };
    this.exportWAV = function(callback, type) {
      const interleaved = audioData.interleaved;
      const numberOfChannels = audioData.channelCount;
      const sampleRate = audioData.sampleRate;
      const samples = audioData.samples;
      const bufferLength = samples.length * samples[0].length;
      const wav = new ArrayBuffer(44 + bufferLength);
      const view = new DataView(wav);
      const writeString = function(view, offset, string) {
        for (let i = 0; i < string.length; i++) {
          view.setUint8(offset + i, string.charCodeAt(i));
        }
      };
      const floatTo16BitPCM = function(output, offset, input) {
        for (let i = 0; i < input.length; i++, offset += 2) {
          const s = Math.max(-1, Math.min(1, input[i]));
          output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        }
      };
      writeString(view, 0, 'RIFF');
      view.setUint32(4, 36 + bufferLength, true);
      writeString(view, 8, 'WAVE');
      writeString(view, 12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, numberOfChannels, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * 2, true);
      view.setUint16(32, numberOfChannels * 2, true);
      view.setUint16(34, 16, true);
      writeString(view, 36, 'data');
      view.setUint32(40, bufferLength, true);
      const output = new DataView(wav, 44);
      if (interleaved) {
        const inputData = mergeBuffers(samples
