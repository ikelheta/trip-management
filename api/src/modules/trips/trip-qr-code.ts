import QRCode from 'qrcode';

/** The url a trip's QR code opens; the trip id is its last path segment. */
export function toTripQrUrl(baseUrl: string, tripId: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/${tripId}`;
}

// Plain url text (no JSON) so phone cameras open it directly.
export function renderTripQrCode(url: string): Promise<Buffer> {
  return QRCode.toBuffer(url, {
    type: 'png',
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 512,
  });
}
