/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

export default function useClickableCard(onActivate) {
  const onKeydown = (event, ...args) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onActivate(...args);
    }
  };
  return { onKeydown };
}
