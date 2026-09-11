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

const styleTextOf = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('style'))
    .map((style) => style.textContent ?? '')
    .join('\n')

/**
 * `ChartContainer` writes every config key into a `<style>` element as `--color-<key>`,
 * and rrweb records `<style>` text without masking it, so a config keyed by column name
 * would put customer column names into a recording.
 */
describe('QueryResultChart column names in CSS', () => {
  it.each([
    ['bar', false],
    ['line', false],
    ['bar', true],
    ['line', true],
  ])('keys the style by position for type=%s cumulative=%s', (type, cumulative) => {
    const { container } = customRender(
      <QueryResultChart
        chart={{ ...chart, type: type as 'bar' | 'line', cumulative }}
        result={result as never}
      />
    )

    const css = styleTextOf(container)
    expect(css).toContain('--color-series_0')
    expect(css).not.toContain(CUSTOMER_COLUMN)
  })

  it('emits one distinct series key per selected column', () => {
    const twoSeries = { ...chart, y_series: [CUSTOMER_COLUMN, 'customer_plan'] }
    const rows = result.rows.map((row) => ({ ...row, customer_plan: 1 }))
    const { container } = customRender(
      <QueryResultChart chart={twoSeries} result={{ rows } as never} />
    )

    // ChartStyle emits one block per theme, so count distinct keys rather than matches.
    const seriesKeys = new Set(styleTextOf(container).match(/--color-series_\d+/g))
    expect(seriesKeys.size).toBe(twoSeries.y_series.length)
    expect(styleTextOf(container)).not.toContain('customer_plan')
  })

  it('leaves the X column name alone, which ChartBar and ChartLine check for "timestamp"', () => {
    const timestampChart = { ...chart, x_column: 'timestamp' }
    const rows = [
      { timestamp: '2026-01-01T00:00:00Z', [CUSTOMER_COLUMN]: 4 },
      { timestamp: '2026-01-02T00:00:00Z', [CUSTOMER_COLUMN]: 7 },
    ]
    const { container } = customRender(
      <QueryResultChart chart={timestampChart} result={{ rows } as never} />
    )

    // The date-range footer only renders when xKey is literally 'timestamp'.
    expect(container.textContent).toContain('2026')
    expect(styleTextOf(container)).not.toContain(CUSTOMER_COLUMN)
  })

  it('keeps the X key distinct when the X column is named like a series key', () => {
    const colliding = { ...chart, x_column: 'series_0' }
    const rows = [
      { series_0: 'a', [CUSTOMER_COLUMN]: 4 },
      { series_0: 'b', [CUSTOMER_COLUMN]: 7 },
    ]
    const { container } = customRender(
      <QueryResultChart chart={colliding} result={{ rows } as never} />
    )

    // Without the guard the X value would overwrite the Y value under the same row key.
    const seriesKeys = new Set(styleTextOf(container).match(/--color-series_\d+/g))
    expect(seriesKeys.size).toBe(1)
  })
})

// The column name still reaches the chart as `config[key].label`, which `chart.tsx`
// renders into the tooltip and legend as text. That path is not asserted here because
// recharts does not render either one at the 0x0 size jsdom gives the container.
