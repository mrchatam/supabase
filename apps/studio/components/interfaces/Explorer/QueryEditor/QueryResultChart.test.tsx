import { describe, expect, it } from 'vitest'

import { QueryResultChart } from './QueryResultChart'
import { customRender } from '@/tests/lib/custom-render'

const CUSTOMER_COLUMN = 'customer_email_address'

const chart = {
  type: 'bar' as const,
  x_column: 'day',
  y_series: [CUSTOMER_COLUMN],
  cumulative: false,
  show_labels: true,
  scale: 'linear' as const,
}

const result = {
  rows: [
    { day: '2026-01-01', [CUSTOMER_COLUMN]: 4 },
    { day: '2026-01-02', [CUSTOMER_COLUMN]: 7 },
  ],
}

/**
 * `ChartContainer` writes every config key into a `<style>` element as `--color-<key>`,
 * and rrweb records `<style>` text without masking it, so a config keyed by column name
 * published customer column names into session recordings.
 */
describe('QueryResultChart column names in CSS', () => {
  it('keys the chart style by position, not by the customer column name', () => {
    const { container } = customRender(<QueryResultChart chart={chart} result={result as never} />)

    const css = Array.from(container.querySelectorAll('style'))
      .map((style) => style.textContent ?? '')
      .join('\n')

    expect(css).toContain('--color-series_0')
    expect(css).not.toContain(CUSTOMER_COLUMN)
  })

  it('masks nothing away from the chart itself: one series is still rendered per column', () => {
    const { container } = customRender(<QueryResultChart chart={chart} result={result as never} />)

    const css = Array.from(container.querySelectorAll('style'))
      .map((style) => style.textContent ?? '')
      .join('\n')

    // ChartStyle emits one block per theme, so count distinct keys rather than matches.
    const seriesKeys = new Set(css.match(/--color-series_\d+/g))
    expect(seriesKeys.size).toBe(chart.y_series.length)
  })
})

// The column name still reaches the chart as `config[key].label`, which `chart.tsx`
// renders into the tooltip and legend as text. That path is not asserted here because
// recharts does not render either one at the 0x0 size jsdom gives the container.
