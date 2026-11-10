import { useEffect, useRef, useState } from 'react'

interface ContractBarcodeProps {
  value: string
  className?: string
  /** Called once the barcode is drawn (or could not be drawn): printing waits for it. Must be stable. */
  onReady: () => void
}

/** Code 128 of the contract number, drawn by jsbarcode (loaded on demand, its own chunk). */
export function ContractBarcode({ value, className, onReady }: ContractBarcodeProps) {
  const ref = useRef<SVGSVGElement>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    import('jsbarcode')
      .then(({ default: JsBarcode }) => {
        if (cancelled || !ref.current) {
          return
        }
        JsBarcode(ref.current, value, {
          format: 'CODE128',
          height: 48,
          width: 1.6,
          fontSize: 14,
          margin: 0,
          font: 'Cairo, sans-serif',
        })
        onReady()
      })
      .catch(() => {
        if (cancelled) {
          return
        }
        // Without the library the number is printed as text; printing is not blocked.
        setFailed(true)
        onReady()
      })
    return () => {
      cancelled = true
    }
  }, [value, onReady])

  if (failed) {
    return <span className={className}>{value}</span>
  }
  return <svg ref={ref} className={className} role="img" aria-label={value} />
}
