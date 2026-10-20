import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { AppRoutes } from '../app/routes'

describe('App shell', () => {
  it('renders planner page on default route', () => {
    render(<AppRoutes />)
    expect(screen.getByText('My Day (Native Module)')).toBeTruthy()
  })
})
