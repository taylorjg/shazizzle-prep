const SECONDS = 1
const CHANNELS = 1
const SLIVER_SIZE = 1 / 44

const sampleRateValues = [4096, 8192, 16384, 32768, 44100, 1024 * 44]
const fftSizeValues = [32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768]
const gainValues = [0.125, 0.25, 0.5, 0.75, 1.0]
const frequencyValues = [1, 2, 4, 6, 8, 440, 1000, 2000]

let currentSampleRate = 1024 * 44
let currentFftSize = 1024
let currentGain = 0.25
let currentFrequencies = [440, 1000, 2000]

const sampleRateRadioButtons = U.createRadioButtons(
  'sampleRates',
  'sampleRate',
  sampleRateValues)

const fftSizeRadioButtons = U.createRadioButtons(
  'fftSizes',
  'fftSize',
  fftSizeValues)

const gainRadioButtons = U.createRadioButtons(
  'gains',
  'gain',
  gainValues)

const frequencyCheckboxes = U.createCheckboxes(
  'frequencies',
  'frequency',
  frequencyValues)

const onSampleRateChange = () => {
  currentSampleRate = U.getCheckedRadioButton(sampleRateRadioButtons)
  drawCharts(currentSampleRate, currentFftSize, currentGain, currentFrequencies)
}

const onFFtSizeChange = () => {
  currentFftSize = U.getCheckedRadioButton(fftSizeRadioButtons)
  drawCharts(currentSampleRate, currentFftSize, currentGain, currentFrequencies)
}

const onGainChange = () => {
  currentGain = U.getCheckedRadioButton(gainRadioButtons)
  drawCharts(currentSampleRate, currentFftSize, currentGain, currentFrequencies)
}

const onFrequencyChange = () => {
  currentFrequencies = U.getCheckedCheckboxes(frequencyCheckboxes)
  drawCharts(currentSampleRate, currentFftSize, currentGain, currentFrequencies)
}

U.setCheckedRadioButton(sampleRateRadioButtons, currentSampleRate)
U.setCheckedRadioButton(fftSizeRadioButtons, currentFftSize)
U.setCheckedRadioButton(gainRadioButtons, currentGain)
U.setCheckedCheckboxes(frequencyCheckboxes, currentFrequencies)

U.buttonsOnChange(sampleRateRadioButtons, onSampleRateChange)
U.buttonsOnChange(fftSizeRadioButtons, onFFtSizeChange)
U.buttonsOnChange(gainRadioButtons, onGainChange)
U.buttonsOnChange(frequencyCheckboxes, onFrequencyChange)

const makeOscillatorNode = (audioContext, gainNode) => frequency => {
  const oscillatorNode = new OscillatorNode(audioContext, { frequency })
  oscillatorNode.connect(gainNode)
  return oscillatorNode
}

const startOscillator = when => oscillator => oscillator.start(when)
const stopOscillator = when => oscillator => oscillator.stop(when)

const drawCharts = async (sampleRate, fftSize, gain, frequencies) => {
  const audioContext = new OfflineAudioContext(CHANNELS, CHANNELS * sampleRate * SECONDS, sampleRate)
  const gainNode = new GainNode(audioContext, { gain })
  const oscillators = frequencies.map(makeOscillatorNode(audioContext, gainNode))
  gainNode.connect(audioContext.destination)
  const analyserNode = new AnalyserNode(audioContext, { fftSize })
  gainNode.connect(analyserNode)
  oscillators.forEach(startOscillator(audioContext.currentTime + SECONDS * 43 * SLIVER_SIZE))
  oscillators.forEach(stopOscillator(audioContext.currentTime + SECONDS * 44 * SLIVER_SIZE))
  const audioBuffer = await audioContext.startRendering()
  const channelData = audioBuffer.getChannelData(0)
  const timeDomainData = new Uint8Array(analyserNode.frequencyBinCount)
  const frequencyData = new Uint8Array(analyserNode.frequencyBinCount)
  analyserNode.getByteTimeDomainData(timeDomainData)
  analyserNode.getByteFrequencyData(frequencyData)
  U.drawChart('chart1', channelData)
  U.drawChart('chart2', timeDomainData)
  U.drawChart('chart3', frequencyData)
}

drawCharts(currentSampleRate, currentFftSize, currentGain, currentFrequencies)
