<<<<<<< HEAD
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Lighting } from '@/scene/Lighting'
=======
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Lighting } from '@/scene/Lighting';
>>>>>>> 231a395 (feat: place, delete, and rotate interactions (#10))

describe('Lighting', () => {
  it('mounts without throwing', () => {
    // In jsdom, three elements like <ambientLight> render as <ambientlight> custom elements.
    const { container } = render(<Lighting />)
    expect(container).toBeDefined()
  })
})
