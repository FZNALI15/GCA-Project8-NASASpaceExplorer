
 // NASA Space Explorer — Astronomy Picture of the Day

const startInput = document.getElementById('startDate');
const endInput = document.getElementById('endDate');
setupDateInputs(startInput, endInput);

const form = document.getElementById('dateForm');
const gallery = document.getElementById('gallery');
const statusText = document.getElementById('status');
const resultCount = document.getElementById('resultCount');
const fetchButton = document.getElementById('fetchButton');
const modal = document.getElementById('imageModal');
const modalDialog = modal.querySelector('.modal-dialog');
const closeButton = document.getElementById('closeModal');
const spaceFact = document.getElementById('spaceFact');

let lastFocusedElement = null;
let requestController = null;

// Random space facts — LevelUp
const facts = [
  'Sunlight takes about 8 minutes and 20 seconds to reach Earth.',
  'A day on Venus lasts longer than a year on Venus.',
  'Neutron stars can spin hundreds of times every second.',
  'Jupiter’s Great Red Spot is a giant storm that has lasted for centuries.',
  'The Milky Way contains billions of stars, including our Sun.',
  'Saturn is less dense than water.',
  'Footprints on the Moon can remain for millions of years because there is almost no atmosphere.',
  'The light from some galaxies has traveled billions of years to reach us.',
  'Mars is home to Olympus Mons, the tallest known volcano in the solar system.',
  'One year on Neptune takes about 165 Earth years.'
];

let lastFact = -1;

function showFact() {
  let index;
  do {
    index = Math.floor(Math.random() * facts.length);
  } while (index === lastFact && facts.length > 1);

  lastFact = index;
  spaceFact.textContent = facts[index];
}

document.getElementById('newFact').addEventListener('click', showFact);
showFact();

// Date helpers
function parseUTC(date) {
  return new Date(`${date}T00:00:00Z`);
}

function toISO(date) {
  return date.toISOString().slice(0, 10);
}

function formatDate(date) {
  return parseUTC(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC'
  });
}

function setStatus(message, type = '') {
  statusText.textContent = message;
  statusText.className = `status ${type}`;
}

// Keep the selected range within nine days
function syncEndDate() {
  if (!startInput.value) return;

  const limit = parseUTC(startInput.value);
  limit.setUTCDate(limit.getUTCDate() + 8);

  const maxEnd = toISO(limit) < today ? toISO(limit) : today;

  endInput.min = startInput.value;
  endInput.max = maxEnd;

  if (
    !endInput.value ||
    endInput.value < startInput.value ||
    endInput.value > maxEnd
  ) {
    endInput.value = maxEnd;
  }
}

startInput.addEventListener('change', syncEndDate);
syncEndDate();

// Create HTML elements safely
function makeElement(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

// Determine the correct image URL
function getImageURL(entry) {
  if (entry.media_type === 'video') {
    return entry.thumbnail_url || '';
  }

  // The new WordPress API may use url for the article page.
  return entry.hdurl || entry.thumbnail_url || entry.url || '';
}

// Modal window
function openModal(entry) {
  lastFocusedElement = document.activeElement;

  const media = document.getElementById('modalMedia');
  media.replaceChildren();

  if (entry.media_type === 'video') {
    const link = makeElement(
      'a',
      'video-link',
      '▶ Watch NASA video ↗'
    );

    link.href = entry.url || entry.permalink ||
      `https://apod.nasa.gov/apod/ap${entry.date.slice(2).replaceAll('-', '')}.html`;

    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    media.append(link);
  } else {
    const img = document.createElement('img');
    img.src = getImageURL(entry);
    img.alt = entry.alt || entry.title || 'NASA astronomy image';
    media.append(img);
  }

  document.getElementById('modalTitle').textContent =
    entry.title || 'Untitled discovery';

  document.getElementById('modalDate').textContent =
    formatDate(entry.date);

  const explanation = entry.explanation || 'No description available.';
  const temp = document.createElement('div');
  temp.innerHTML = explanation;

  document.getElementById('modalExplanation').textContent =
    temp.textContent || 'No description available.';

  const source = document.getElementById('modalLink');
  source.href = entry.permalink ||
    `https://apod.nasa.gov/apod/ap${entry.date.slice(2).replaceAll('-', '')}.html`;

  modal.hidden = false;
  document.body.classList.add('modal-open');
  closeButton.focus();
}

function closeModal() {
  modal.hidden = true;
  document.body.classList.remove('modal-open');
  document.getElementById('modalMedia').replaceChildren();

  if (lastFocusedElement && lastFocusedElement.isConnected) {
    lastFocusedElement.focus();
  }
}

closeButton.addEventListener('click', closeModal);

modal.addEventListener('click', (event) => {
  if (event.target.dataset.close === 'true') {
    closeModal();
  }
});

document.addEventListener('keydown', (event) => {
  if (modal.hidden) return;

  if (event.key === 'Escape') {
    closeModal();
  }

  if (event.key === 'Tab') {
    const focusable = [
      ...modalDialog.querySelectorAll('button, a[href]')
    ];

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
});

// Create a gallery card
function createCard(entry) {
  const card = makeElement('button', 'gallery-item');
  card.type = 'button';

  card.setAttribute(
    'aria-label',
    `View ${entry.title || 'NASA discovery'} from ${formatDate(entry.date)}`
  );

  const imageWrap = makeElement('div', 'image-wrap');

  if (entry.media_type === 'video') {
    const thumbnail = getImageURL(entry);

    if (thumbnail) {
      const thumb = document.createElement('img');
      thumb.src = thumbnail;
      thumb.alt = '';
      thumb.loading = 'lazy';
      imageWrap.append(thumb);
    } else {
      imageWrap.classList.add('video-placeholder');
      imageWrap.append(
        makeElement('span', 'video-icon', '▶')
      );
    }

    imageWrap.append(
      makeElement('span', 'media-badge', 'VIDEO')
    );
  } else {
    const img = document.createElement('img');

    img.src = getImageURL(entry);
    img.alt = entry.alt || entry.title || 'NASA astronomy image';
    img.loading = 'lazy';

    img.addEventListener('error', () => {
      img.style.display = 'none';
      imageWrap.classList.add('image-fallback');
      imageWrap.append(
        makeElement('span', 'fallback-text', 'Image unavailable')
      );
    }, { once: true });

    imageWrap.append(img);
    imageWrap.append(
      makeElement('span', 'media-badge', 'IMAGE')
    );
  }

  const content = makeElement('div', 'card-content');

  content.append(
    makeElement('p', 'card-date', formatDate(entry.date))
  );

  content.append(
    makeElement('h3', 'card-title', entry.title || 'Untitled discovery')
  );

  content.append(
    makeElement(
      'span',
      'card-action',
      entry.media_type === 'video'
        ? 'Explore video ↗'
        : 'View discovery ↗'
    )
  );

  card.append(imageWrap, content);
  card.addEventListener('click', () => openModal(entry));

  return card;
}


async function fetchAPODForDate(date, signal) {
  const params = new URLSearchParams({
    date: date
  });

  const response = await fetch(
    `https://science.nasa.gov/wp-json/wp/v2/apod-basic?${params}`,
    { signal }
  );

  if (!response.ok) {
    throw new Error(`NASA API error for ${date} (HTTP ${response.status}).`);
  }

  const result = await response.json();

  // Handle either a single entry or an array.
  const entries = Array.isArray(result) ? result : [result];

  // Only accept the requested date.
  const entry = entries.find(item => item.date === date);

  if (!entry) {
    throw new Error(`NASA did not return an entry for ${date}.`);
  }

  return entry;
}

// Fetch NASA APOD data
async function fetchImages() {
  const start = startInput.value;
  const end = endInput.value;

  if (
    !start ||
    !end ||
    start < earliestDate ||
    end > today ||
    end < start
  ) {
    setStatus(
      'Please choose a valid date range within the NASA archive.',
      'error'
    );
    return;
  }

  const days =
    Math.round((parseUTC(end) - parseUTC(start)) / 86400000) + 1;

  if (days > 9) {
    setStatus(
      'Please select a range of no more than 9 consecutive days.',
      'error'
    );
    return;
  }

  if (requestController) {
    requestController.abort();
  }

  const controller = new AbortController();
  requestController = controller;

  fetchButton.disabled = true;
  fetchButton.textContent = 'Loading...';
  resultCount.textContent = 'Searching the stars...';

  gallery.replaceChildren();

  const loading = makeElement('div', 'loading');
  const spinner = makeElement('div', 'spinner');
  spinner.setAttribute('aria-hidden', 'true');

  loading.append(
    spinner,
    makeElement('p', '', 'Loading space photos…')
  );

  gallery.append(loading);
  setStatus('');

  try {
    // New NASA WordPress APOD API
    // No personal API key required in the URL.
    const dates = [];

    for (let i = 0; i < days; i++) {
      const date = parseUTC(start);
      date.setUTCDate(date.getUTCDate() + i);
      dates.push(toISO(date));
    }

    const data = await Promise.all(
      dates.map(date =>
        fetchAPODForDate(date, controller.signal)
      )
    );

    if (!data.length || !data.every(entry => entry && entry.date)) {
      throw new Error('NASA returned an unexpected response.');
    }

    // Detect incorrect placeholder data.
    const invalidData = data.some(entry =>
      entry.title === 'NASA Science' ||
      entry.hdurl?.includes('nasa-logo@2x.png') ||
      entry.url?.includes('nasa-logo@2x.png')
    );

    if (invalidData) {
      throw new Error(
        'NASA returned placeholder image data. Please try again later.'
      );
    }

    data.sort((a, b) => a.date.localeCompare(b.date));

    gallery.replaceChildren();

    const cards = document.createDocumentFragment();

    data.forEach(entry => {
      cards.append(createCard(entry));
    });

    gallery.append(cards);

    resultCount.textContent =
      `${data.length} ${data.length === 1 ? 'discovery' : 'discoveries'}`;

    if (data.length < days) {
      setStatus(
        `Showing ${data.length} available entries for your selected range.`,
        'info'
      );
    }

  } catch (error) {
    if (error.name === 'AbortError') return;

    gallery.replaceChildren(
      makeElement(
        'div',
        'empty-state',
        'We couldn’t reach the stars this time. Try again in a moment.'
      )
    );

    resultCount.textContent = 'Unable to load';

    setStatus(
      error.message || 'Something went wrong while loading NASA data.',
      'error'
    );

    console.error('NASA APOD request failed:', error);

  } finally {
    if (requestController === controller) {
      fetchButton.disabled = false;
      fetchButton.textContent = '✦   Get Space Images';
      requestController = null;
    }
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  fetchImages();
});

// Automatically load the default date range
fetchImages();
