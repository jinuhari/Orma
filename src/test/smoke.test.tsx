import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { AppRoutes } from '../app/routes'

describe('App shell', () => {
  it('renders planner page on planner route', () => {
    render(
      <MemoryRouter initialEntries={['/planner']}>
        <AppRoutes />
      </MemoryRouter>,
    )
    expect(screen.getByText('My Day (Native Module)')).toBeTruthy()
  })
})
