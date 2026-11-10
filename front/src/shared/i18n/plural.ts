type PluralForms = Partial<Record<Intl.LDMLPluralRule, string>> & { other: string }

/** Arabic has zero / one / two / few / many / other forms. `{count}` is replaced by the number. */
export function plural(locale: string, count: number, forms: PluralForms): string {
  const rule = new Intl.PluralRules(locale).select(count)
  return (forms[rule] ?? forms.other).replace('{count}', String(count))
}
