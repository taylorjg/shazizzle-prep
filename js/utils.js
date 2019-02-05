const U = {};

(function (exports) {

  const SLIVER_SIZE = 1 / 44

  const createCheckboxes = (parentId, name, values) => {
    const parent = document.getElementById(parentId)
    return values.map(value => {
      const label = document.createElement('label')
      label.setAttribute('class', 'checkbox-inline')
      const input = document.createElement('input')
      input.setAttribute('type', 'checkbox')
      input.setAttribute('id', `${name}${value}`)
      input.setAttribute('value', value)
      const text = document.createTextNode(value)
      label.appendChild(input)
      label.appendChild(text)
      parent.appendChild(label)
      return input
    })
  }

  const createRadioButtons = (parentId, name, values) => {
    const parent = document.getElementById(parentId)
    return values.map(value => {
      const label = document.createElement('label')
      label.setAttribute('class', 'radio-inline')
      const input = document.createElement('input')
      input.setAttribute('type', 'radio')
      input.setAttribute('name', name)
      input.setAttribute('id', `${name}${value}`)
      input.setAttribute('value', value)
      const text = document.createTextNode(value)
      label.appendChild(input)
      label.appendChild(text)
      parent.appendChild(label)
      return input
    })
  }

  const setCheckedRadioButton = (buttons, value) =>
    buttons.forEach(button =>
      button.checked = value === Number(button.value))

  const getCheckedRadioButton = buttons =>
    buttons
      .map(button => button.checked ? Number(button.value) : undefined)
      .filter(R.identity)[0]

  const setCheckedCheckboxes = (buttons, values) =>
    buttons.forEach(button =>
      button.checked = values.includes(Number(button.value)))

  const getCheckedCheckboxes = buttons =>
    buttons
      .map(button => button.checked ? Number(button.value) : undefined)
      .filter(R.identity)

  const buttonsOnChange = (buttons, fn) =>
    buttons.forEach(button => button.addEventListener('change', fn))

  const findBound = (xs, f) => xs.reduce((acc, x) => f(x, acc) ? x : acc)
  const upperBound = xs => Math.ceil(findBound(xs, R.gt))
  const lowerBound = xs => Math.floor(findBound(xs, R.lt))

  const drawChart = (elementId, data, yBounds = null) => {
    const indices = R.range(0, data.length)
    const config = {
      type: 'line',
      data: {
        labels: indices,
        datasets: [{
          borderColor: 'orange',
          borderWidth: 0.5,
          pointStyle: 'line',
          radius: 1,
          data,
          fill: false,
        }]
      },
      options: {
        events: [],
        animation: {
          duration: 0
        },
        legend: {
          display: false
        },
        scales: {
          yAxes: [{
            ticks: {
              min: yBounds ? yBounds.min : lowerBound(data),
              max: yBounds ? yBounds.max : upperBound(data)
            }
          }]
        }
      }
    }

    const chart = document.getElementById(elementId)
    new Chart(chart, config)
  }

  const copySliver = (srcBuffer, dstBuffer, sliverIndex) => {
    const srcDataStartIndex = Math.floor(srcBuffer.sampleRate * sliverIndex * SLIVER_SIZE)
    const srcDataEndIndex = Math.floor(srcBuffer.sampleRate * (sliverIndex + 1) * SLIVER_SIZE)
    const srcDataRange = R.range(srcDataStartIndex, srcDataEndIndex)
    const channelRange = R.range(0, srcBuffer.numberOfChannels)
    channelRange.forEach(channelIndex => {
      const srcChannelData = srcBuffer.getChannelData(channelIndex)
      const dstChannelData = dstBuffer.getChannelData(channelIndex)
      srcDataRange.forEach(srcDataIndex => {
        const dstDataIndex = srcDataIndex - srcDataStartIndex
        dstChannelData[dstDataIndex] = srcChannelData[srcDataIndex]
      })
    })
  }

  const getSliverData = async (inputBuffer, sliverIndex) => {
    const options = {
      numberOfChannels: inputBuffer.numberOfChannels,
      length: Math.ceil(inputBuffer.numberOfChannels * inputBuffer.sampleRate * SLIVER_SIZE),
      sampleRate: inputBuffer.sampleRate
    }
    const sliverBuffer = new AudioBuffer(options)
    copySliver(inputBuffer, sliverBuffer, sliverIndex)
    const audioContext = new OfflineAudioContext(options)
    const sourceNode = new AudioBufferSourceNode(audioContext, { buffer: sliverBuffer })
    const analyserNode = new AnalyserNode(audioContext, { fftSize: 1024 })
    sourceNode.connect(audioContext.destination)
    sourceNode.connect(analyserNode)
    sourceNode.start()
    await audioContext.startRendering()
    const timeDomainData = new Uint8Array(analyserNode.frequencyBinCount)
    const frequencyData = new Uint8Array(analyserNode.frequencyBinCount)
    analyserNode.getByteTimeDomainData(timeDomainData)
    analyserNode.getByteFrequencyData(frequencyData)
    return {
      timeDomainData,
      frequencyData
    }
  }

  const visualiseSliver = async (inputBuffer, sliverIndex, timeDomainChartId, fftChartId) => {
    const { timeDomainData, frequencyData } = await getSliverData(inputBuffer, sliverIndex)
    const yBounds = { min: 0, max: 255 }
    drawChart(timeDomainChartId, timeDomainData, yBounds)
    drawChart(fftChartId, frequencyData, yBounds)
  }

  const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

  exports.createCheckboxes = createCheckboxes
  exports.createRadioButtons = createRadioButtons
  exports.getCheckedCheckboxes = getCheckedCheckboxes
  exports.setCheckedCheckboxes = setCheckedCheckboxes
  exports.getCheckedRadioButton = getCheckedRadioButton
  exports.setCheckedRadioButton = setCheckedRadioButton
  exports.buttonsOnChange = buttonsOnChange
  exports.delay = delay
  exports.drawChart = drawChart
  exports.copySliver = copySliver
  exports.getSliverData = getSliverData
  exports.visualiseSliver = visualiseSliver
  exports.SLIVER_SIZE = SLIVER_SIZE
})(U)
