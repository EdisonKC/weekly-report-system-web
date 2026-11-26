export function downloadResponse(response, fallbackName) {
  const disposition = response.headers?.['content-disposition'] || ''
  const match = /filename\*=UTF-8''([^;]+)/i.exec(disposition)
  let filename = fallbackName
  if (match) {
    try {
      filename = decodeURIComponent(match[1])
    } catch (e) {
      filename = fallbackName
    }
  }
  const contentType = response.headers?.['content-type'] || 'application/octet-stream'
  const blob = response.data instanceof Blob
    ? response.data
    : new Blob([response.data], { type: contentType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  return filename
}
