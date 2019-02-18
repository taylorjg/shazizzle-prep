let currentDuration = 5
let currentSliver = 0
let maxSliver = 0
let audioBuffer = null

const durationValues = [1, 2, 5, 10, 15]

const durationRadioButtons = U.createRadioButtons(
  'durations',
  'duration',
  durationValues)

const onDurationChange = () => {
  currentDuration = U.getCheckedRadioButton(durationRadioButtons)
}

U.setCheckedRadioButton(durationRadioButtons, currentDuration)
U.buttonsOnChange(durationRadioButtons, onDurationChange)

const recordButton = document.getElementById('record')
const controlPanel = document.getElementById('controlPanel')
const fastBackward44 = document.getElementById('fastBackward44')
const fastBackward10 = document.getElementById('fastBackward10')
const stepBackward = document.getElementById('stepBackward')
const stepForward = document.getElementById('stepForward')
const fastForward10 = document.getElementById('fastForward10')
const fastForward44 = document.getElementById('fastForward44')
const currentSliverLabel = document.getElementById('currentSliverLabel')
const maxSliverLabel = document.getElementById('maxSliverLabel')
const sliverSlider = document.getElementById('sliverSlider')

const onRecord = async () => {

  const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const mediaRecorder = new MediaRecorder(mediaStream)

  const chunks = []
  mediaRecorder.ondataavailable = e => chunks.push(e.data)

  mediaRecorder.onstart = () => {
    const liveVisualisationObservable = U.createLiveVisualisationObservable(mediaRecorder, mediaStream)
    liveVisualisationObservable.subscribe(liveChartingObserver)
  }

  mediaRecorder.onstop = async () => {
    const track = R.head(mediaStream.getTracks())
    const mediaTrackSettings = track.getSettings()
    const audioBuffer = await U.decodeChunks(chunks, mediaTrackSettings.sampleRate)
    mediaStream && mediaStream.getTracks().forEach(track => track.stop())
    currentSliver = 0
    maxSliver = Math.floor(audioBuffer.duration / U.SLIVER_DURATION)
    sliverSlider.min = 0
    sliverSlider.max = maxSliver - 1
    setCurrentSliver(0)()
    U.drawSpectrogram('spectrogram', audioBuffer)
  }

  updateRecordingState(RECORDING)
  mediaRecorder.start()
  await U.delay(currentDuration * 1000)
  mediaRecorder.stop()
  updateRecordingState(NOT_RECORDING)
}

const liveChartingObserver = {
  next: value => {
    U.drawTimeDomainChart('timeDomainChart', value.timeDomainData)
    U.drawFFTChart('fftChart', value.frequencyData, value.sampleRate)
  }
}

const RECORDING = Symbol('RECORDING')
const NOT_RECORDING = Symbol('NOT_RECORDING')

const updateRecordingState = state => {
  recordButton.disabled = state === RECORDING
  controlPanel1.style.display = state === RECORDING ? 'none' : 'block'
  controlPanel2.style.display = state === RECORDING ? 'none' : 'block'
}

const updateSliverControlsState = () => {
  fastBackward44.disabled = currentSliver < 44
  fastBackward10.disabled = currentSliver < 10
  stepBackward.disabled = currentSliver < 1
  stepForward.disabled = currentSliver >= (maxSliver - 1)
  fastForward10.disabled = currentSliver >= (maxSliver - 10)
  fastForward44.disabled = currentSliver >= (maxSliver - 44)
}

const setCurrentSliver = adjustment => () => {
  currentSliver += adjustment
  sliverSlider.value = currentSliver
  updateSliverControlsState()
  currentSliverLabel.innerText = `${currentSliver + 1}`
  maxSliverLabel.innerText = `${maxSliver}`
  U.visualiseSliver(audioBuffer, currentSliver, 'timeDomainChart', 'fftChart')
}

const onSliverSliderChange = e => {
  currentSliver = e.target.valueAsNumber
  setCurrentSliver(0)()
}

fastBackward44.addEventListener('click', setCurrentSliver(-44))
fastBackward10.addEventListener('click', setCurrentSliver(-10))
stepBackward.addEventListener('click', setCurrentSliver(-1))
stepForward.addEventListener('click', setCurrentSliver(+1))
fastForward10.addEventListener('click', setCurrentSliver(+10))
fastForward44.addEventListener('click', setCurrentSliver(+44))

sliverSlider.addEventListener('click', onSliverSliderChange)
// TODO: use RxJS's debounceTime ?
sliverSlider.addEventListener('input', onSliverSliderChange)

recordButton.addEventListener('click', onRecord)
