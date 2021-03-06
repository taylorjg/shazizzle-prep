import '../AudioContextMonkeyPatch.js'
import * as UW from '../common/utils/utilsWebAudioApi.js'
import { it_multiple } from './it_multiple.js'

describe('Exploratory tests', () => {

  const findTopBins = frequencyData => {
    const binValues = Array.from(frequencyData)
    const zipped = binValues.map((binValue, index) => ({ binValue, index }))
    return zipped.sort((a, b) => b.binValue - a.binValue)
  }

  it_multiple(
    [
      440,
      1000,
      2500,
      5000,
      10000,
      18000
    ],
    'FFT identifies correct frequency from single oscillator',
    async frequency => {
      const DURATION = 1
      const SAMPLE_RATE = 44100
      const FFT_SIZE = 1024
      const length = DURATION * SAMPLE_RATE
      const audioContext = new OfflineAudioContext(1, length, SAMPLE_RATE)
      const oscillatorNode = audioContext.createOscillator()
      oscillatorNode.frequency.value = frequency
      const analyserNode = audioContext.createAnalyser()
      analyserNode.fftSize = FFT_SIZE
      oscillatorNode.connect(analyserNode)
      analyserNode.connect(audioContext.destination)
      oscillatorNode.start()
      oscillatorNode.stop(DURATION)
      await UW.startRenderingPromise(audioContext)
      const frequencyData = new Uint8Array(analyserNode.frequencyBinCount)
      analyserNode.getByteFrequencyData(frequencyData)
      const binSize = SAMPLE_RATE / FFT_SIZE
      const topBinIndex = Math.round(frequency / binSize)
      const topBins = findTopBins(frequencyData)
      chai.expect(topBins[0].index).to.equal(topBinIndex)
    })

  it_multiple(
    [
      [440, 1000],
      [1000, 2000],
      [80, 440, 1000],
      [80, 440, 1000, 2500]
    ],
    'FFT identifies correct frequencies from multiple oscillators',
    async (...frequencies) => {
      const DURATION = 1
      const SAMPLE_RATE = 44100
      const FFT_SIZE = 1024
      const length = DURATION * SAMPLE_RATE
      const audioContext = new OfflineAudioContext(1, length, SAMPLE_RATE)
      const analyserNode = audioContext.createAnalyser()
      analyserNode.fftSize = FFT_SIZE
      analyserNode.connect(audioContext.destination)
      const gainNode = audioContext.createGain()
      gainNode.gain.value = 0.125
      gainNode.connect(analyserNode)
      const oscillatorNodes = frequencies.map(frequency => {
        const oscillatorNode = audioContext.createOscillator()
        oscillatorNode.frequency.value = frequency
        return oscillatorNode
      })
      oscillatorNodes.map(source => source.connect(gainNode))
      oscillatorNodes.map(source => source.start())
      oscillatorNodes.map(source => source.stop(DURATION))
      await UW.startRenderingPromise(audioContext)
      const frequencyData = new Uint8Array(analyserNode.frequencyBinCount)
      analyserNode.getByteFrequencyData(frequencyData)
      const binSize = SAMPLE_RATE / FFT_SIZE
      const expectedTopBinIndices = frequencies.map(frequency => Math.round(frequency / binSize))
      const actualTopBinIndices = R.compose(
        R.take(frequencies.length),
        R.pluck('index'),
        findTopBins
      )(frequencyData)
      expectedTopBinIndices.forEach(expectedTopBinIndex =>
        chai.expect(actualTopBinIndices).to.include(expectedTopBinIndex))
    })

  it_multiple(
    [
      ['440Hz_44100Hz_16bit_05sec.mp3', 440],
      ['1kHz_44100Hz_16bit_05sec.mp3', 1000],
      ['10kHz_44100Hz_16bit_05sec.mp3', 10000]
    ],
    'FFT identifies correct frequency from a test tone .mp3 file',
    async (testToneFile, frequency) => {

      const DURATION = 5
      const SAMPLE_RATE = 44100
      const FFT_SIZE = 1024

      const config = { responseType: 'arraybuffer' }
      const response = await axios.get(`/signals/${testToneFile}`, config)
      const data = response.data

      const length = DURATION * SAMPLE_RATE
      const audioContext = new OfflineAudioContext(1, length, SAMPLE_RATE)
      const audioBuffer = await UW.decodeAudioDataPromise(audioContext, data)

      const sourceNode = audioContext.createBufferSource()
      sourceNode.buffer = audioBuffer
      const analyserNode = audioContext.createAnalyser()
      analyserNode.fftSize = FFT_SIZE
      sourceNode.connect(audioContext.destination)
      sourceNode.connect(analyserNode)
      sourceNode.start()
      await UW.startRenderingPromise(audioContext)
      const frequencyData = new Uint8Array(analyserNode.frequencyBinCount)
      analyserNode.getByteFrequencyData(frequencyData)

      const binSize = SAMPLE_RATE / FFT_SIZE
      const topBinIndex = Math.round(frequency / binSize)
      const topBins = findTopBins(frequencyData)
      chai.expect(topBins[0].index).to.equal(topBinIndex)
    })
})
