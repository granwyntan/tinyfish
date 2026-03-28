export const sgdFormatter = new Intl.NumberFormat("en-SG", {
  style: "currency",
  currency: "SGD",
  maximumFractionDigits: 2
});

export const compactFormatter = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1
});

export function formatOriginalPrice(amount: number, currency: string) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "JPY" ? 0 : 2
  }).format(amount);
}

export function formatSentiment(score: number) {
  return `${Math.round(score * 100)}%`;
}

export function formatRating(score: number) {
  return `${score.toFixed(1)}/5`;
}

export function formatDeliveryRange(minDays: number, maxDays: number) {
  return minDays === maxDays ? `${minDays} day` : `${minDays}-${maxDays} days`;
}

export function formatWorthIt(score: number) {
  return `${score.toFixed(0)}/100`;
}
