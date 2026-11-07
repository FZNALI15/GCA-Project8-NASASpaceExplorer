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
  do { index = Math.floor(Math.random() * facts.length); }
  while (index === lastFact && facts.length > 1);
  lastFact = index;
  spaceFact.textContent = facts[index];
}
document.getElementById('newFact').addEventListener('click', showFact);
showFact();

function parseUTC(date) { return new Date(`${date}T00:00:00Z`); }
function toISO(date) { return date.toISOString().slice(0, 10); }
function formatDate(date) {
  return parseUTC(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}
function setStatus(message, type = '') {
  statusText.textContent = message;
  statusText.className = `status ${type}`;
}

// The starter file sets the dates. Keep the end date within nine days of the start.
function syncEndDate() {
  if (!startInput.value) return;
  const limit = parseUTC(startInput.value);
  limit.setUTCDate(limit.getUTCDate() + 8);
  const maxEnd = toISO(limit) < endInput.max ? toISO(limit) : endInput.max;
  endInput.min = startInput.value;
  endInput.max = maxEnd;
  if (!endInput.value || endInput.value < startInput.value || endInput.value > maxEnd) {
    endInput.value = maxEnd;
  }
}
startInput.addEventListener('change', syncEndDate);
syncEndDate();

function makeElement(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

function openModal(entry) {
  lastFocusedElement = document.activeElement;
  const media = document.getElementById('modalMedia');
  media.replaceChildren();
  if (entry.media_type === 'video') {
    const link = makeElement('a', 'video-link', '▶ Watch NASA video ↗');
    link.href = entry.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    media.append(link);
  } else {
    const img = document.createElement('img');
    img.src = entry.hdurl || entry.url;
    img.alt = entry.title || 'NASA astronomy image';
    media.append(img);
  }
  document.getElementById('modalTitle').textContent = entry.title || 'Untitled discovery';
  document.getElementById('modalDate').textContent = formatDate(entry.date);
  document.getElementById('modalExplanation').textContent = entry.explanation || 'No description available.';
  const source = document.getElementById('modalLink');
  source.href = `https://apod.nasa.gov/apod/ap${entry.date.slice(2).replaceAll('-', '')}.html`;
  modal.hidden = false;
  document.body.classList.add('modal-open');
  closeButton.focus();
}
function closeModal() {
  modal.hidden = true;
  document.body.classList.remove('modal-open');
  document.getElementById('modalMedia').replaceChildren();
  if (lastFocusedElement && lastFocusedElement.isConnected) lastFocusedElement.focus();
}
closeButton.addEventListener('click', closeModal);
modal.addEventListener('click', (event) => {
  if (event.target.dataset.close === 'true') closeModal();
});
document.addEventListener('keydown', (event) => {
  if (modal.hidden) return;
  if (event.key === 'Escape') closeModal();
  if (event.key === 'Tab') {
    const focusable = [...modalDialog.querySelectorAll('button, a[href]')];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
});

function createCard(entry) {
  const card = makeElement('button', 'gallery-item');
  card.type = 'button';
  card.setAttribute('aria-label', `View ${entry.title || 'NASA discovery'} from ${formatDate(entry.date)}`);
  const imageWrap = makeElement('div', 'image-wrap');
  if (entry.media_type === 'video') {
    if (entry.thumbnail_url) {
      const thumb = document.createElement('img');
      thumb.src = entry.thumbnail_url;
      thumb.alt = '';
      thumb.loading = 'lazy';
      imageWrap.append(thumb);
    } else {
      imageWrap.classList.add('video-placeholder');
      imageWrap.append(makeElement('span', 'video-icon', '▶'));
    }
    imageWrap.append(makeElement('span', 'media-badge', 'VIDEO'));
  } else {
    const img = document.createElement('img');
    img.src = entry.url;
    img.alt = entry.title || 'NASA astronomy image';
    img.loading = 'lazy';
    img.addEventListener('error', () => { img.style.display = 'none'; imageWrap.classList.add('image-fallback'); imageWrap.append(makeElement('span', 'fallback-text', 'Image unavailable')); }, { once: true });
    imageWrap.append(img);
    imageWrap.append(makeElement('span', 'media-badge', 'IMAGE'));
  }
  const content = makeElement('div', 'card-content');
  content.append(makeElement('p', 'card-date', formatDate(entry.date)));
  content.append(makeElement('h3', 'card-title', entry.title || 'Untitled discovery'));
  content.append(makeElement('span', 'card-action', entry.media_type === 'video' ? 'Explore video ↗' : 'View discovery ↗'));
  card.append(imageWrap, content);
  card.addEventListener('click', () => openModal(entry));
  return card;
}

async function fetchImages() {
  const start = startInput.value;
  const end = endInput.value;
  if (!start || !end || start < earliestDate || end > today || end < start) {
    setStatus('Please choose a valid date range within the NASA archive.', 'error');
    return;
  }
  const days = Math.round((parseUTC(end) - parseUTC(start)) / 86400000) + 1;
  if (days > 9) {
    setStatus('Please select a range of no more than 9 consecutive days.', 'error');
    return;
  }
  if (requestController) requestController.abort();
  requestController = new AbortController();
  fetchButton.disabled = true;
  fetchButton.textContent = 'Loading...';
  resultCount.textContent = 'Searching the stars...';
  gallery.replaceChildren();
  const loading = makeElement('div', 'loading');
  const spinner = makeElement('div', 'spinner');
  spinner.setAttribute('aria-hidden', 'true');
  loading.append(spinner, makeElement('p', '', 'Loading space photos…'));
  gallery.append(loading);
  setStatus('');
  try {
    const params = new URLSearchParams({ api_key: 'd7tPcRQgpHDJjNm9PJrNkqCjtpkhhdmkbgfcHK7q', start_date: start, end_date: end, thumbs: 'true' });
    const response = await fetch(`https://api.nasa.gov/planetary/apod?${params}`, { signal: requestController.signal });
    if (!response.ok) {
      if (response.status === 429 || response.status === 403) throw new Error('NASA API rate limit reached. Please try again later or use your own API key.');
      throw new Error(`NASA could not load this date range (HTTP ${response.status}). Please try again.`);
    }
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('NASA returned an unexpected response. Please try again.');
    data.sort((a, b) => a.date.localeCompare(b.date));
    gallery.replaceChildren();
    if (!data.length) {
      gallery.append(makeElement('p', 'empty-state', 'No discoveries were found for these dates.'));
      resultCount.textContent = '0 discoveries';
    } else {
      const cards = document.createDocumentFragment();
      data.forEach(entry => cards.append(createCard(entry)));
      gallery.append(cards);
      resultCount.textContent = `${data.length} ${data.length === 1 ? 'discovery' : 'discoveries'}`;
      if (data.length < 9) setStatus(`Showing ${data.length} available entries for your selected range.`, 'info');
    }
  } catch (error) {
    if (error.name === 'AbortError') return;
    gallery.replaceChildren(makeElement('div', 'empty-state', 'We couldn’t reach the stars this time. Try again in a moment.'));
    resultCount.textContent = 'Unable to load';
    setStatus(error.message || 'Something went wrong while loading NASA data.', 'error');
    console.error('NASA APOD request failed:', error);
  } finally {
    fetchButton.disabled = false;
    fetchButton.textContent = '✦   Get Space Images';
  }
}
form.addEventListener('submit', (event) => { event.preventDefault(); fetchImages(); });
// Load the default nine-day range automatically.
fetchImages();
