import { useEffect, useState } from 'react'

export default function InstallApp() {
  const [promptEvent, setPromptEvent] = useState(null)
  const [installed, setInstalled] = useState(false)
  const [hint, setHint] = useState('')

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
    if (standalone) setInstalled(true)

    const onPrompt = (event) => {
      event.preventDefault()
      setPromptEvent(event)
    }
    const onInstalled = () => {
      setInstalled(true)
      setPromptEvent(null)
      setHint('')
    }

    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (installed) return null

  const install = async () => {
    if (promptEvent) {
      promptEvent.prompt()
      const choice = await promptEvent.userChoice
      setPromptEvent(null)
      if (choice.outcome === 'accepted') setInstalled(true)
      return
    }

    const ios = /iphone|ipad|ipod/i.test(window.navigator.userAgent)
    setHint(
      ios
        ? 'در Safari دکمه اشتراک را بزن و «افزودن به صفحه اصلی» را انتخاب کن.'
        : 'اگر پنجره نصب باز نشد، از منوی مرورگر گزینه Install یا افزودن به صفحه اصلی را بزن.',
    )
  }

  return (
    <div className="install-app">
      <button type="button" className="install-app__btn" onClick={install}>
        دانلود app
      </button>
      {hint ? <p className="install-app__hint">{hint}</p> : null}
    </div>
  )
}
