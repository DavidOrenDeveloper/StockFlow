const P = {
  plus: 'M12 5v14M5 12h14', minus: 'M5 12h14', x: 'M18 6 6 18M6 6l12 12', check: 'M20 6 9 17l-5-5', search: 'M11 4a7 7 0 100 14 7 7 0 000-14zM21 21l-4.3-4.3',
  edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z', trash: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6',
  download: 'M12 3v12M7 10l5 5 5-5M5 21h14', upload: 'M12 21V9M7 14l5-5 5 5M5 3h14', share: 'M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7M16 6l-4-4-4 4M12 2v13',
  box: 'M21 8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8', clipboard: 'M9 3h6v4H9zM7 5H5a1 1 0 00-1 1v14a1 1 0 001 1h14a1 1 0 001-1V6a1 1 0 00-1-1h-2M8 12h8M8 16h5',
  cart: 'M3 4h2l2.5 11h10l2-8H6M9 20a1 1 0 100 .01M17 20a1 1 0 100 .01', folder: 'M3 6a1 1 0 011-1h5l2 2h8a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1z',
  sliders: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6', copy: 'M9 9h11v11H9zM5 15V5a2 2 0 012-2h10',
  image: 'M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2zM8.5 10a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM21 15l-5-5L5 21', zoom: 'M11 4a7 7 0 100 14 7 7 0 000-14zM21 21l-4.3-4.3M11 8v6M8 11h6',
  refresh: 'M21 12a9 9 0 11-3-6.7M21 3v6h-6', file: 'M14 3H6a1 1 0 00-1 1v16a1 1 0 001 1h12a1 1 0 001-1V8zM14 3v5h5', table: 'M3 5h18v14H3zM3 10h18M3 15h18M9 5v14', more: 'M12 6h.01M12 12h.01M12 18h.01',
  wand: 'M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8L19 13M17.8 6.2L19 5M3 21l9-9M12.2 6.2L11 5', list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01', back: 'M15 18l-6-6 6-6', eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 100 6 3 3 0 000-6z', alert: 'M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z', history: 'M3 12a9 9 0 109-9 9 9 0 00-6.4 2.6L3 8M3 3v5h5M12 7v5l3 2', globe: 'M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18'
};
export const ic = (n, s = 20) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${P[n] || ''}"/></svg>`;
