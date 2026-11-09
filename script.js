/**
 * PageTurner - Personal Library & Reading Tracker
 * Pure HTML, CSS, JavaScript using localStorage
 */

(function () {
  'use strict';

  // --- Constants & State ---
  const STORAGE_KEY = 'pageturner_books';
  const THEME_KEY = 'pageturner_theme';

  let books = [];
  let currentFilter = 'all'; // 'all' | 'read' | 'unread'
  let currentSort = 'newest';
  let searchQuery = '';
  let pendingDeleteId = null;
  let activeCoverDataUrl = ''; // Used for file upload preview/persistence

  // Sample books to help users get started quickly
  const SAMPLE_BOOKS = [
    {
      id: 'sample-1',
      title: 'Atomic Habits',
      author: 'James Clear',
      cover: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80',
      description: 'An easy & proven way to build good habits & break bad ones. Small changes make a remarkable difference over time.',
      isRead: true,
      createdAt: Date.now() - 30000000,
      updatedAt: Date.now() - 30000000
    },
    {
      id: 'sample-2',
      title: 'To Kill a Mockingbird',
      author: 'Harper Lee',
      cover: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=600&q=80',
      description: 'A classic novel exploring themes of racial injustice, empathy, and the destruction of innocence in the American South.',
      isRead: true,
      createdAt: Date.now() - 20000000,
      updatedAt: Date.now() - 20000000
    },
    {
      id: 'sample-3',
      title: 'The Great Gatsby',
      author: 'F. Scott Fitzgerald',
      cover: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=600&q=80',
      description: 'A story of the fabulously wealthy Jay Gatsby and his love for the beautiful Daisy Buchanan in the Roaring Twenties.',
      isRead: false,
      createdAt: Date.now() - 10000000,
      updatedAt: Date.now() - 10000000
    },
    {
      id: 'sample-4',
      title: 'Deep Work',
      author: 'Cal Newport',
      cover: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=600&q=80',
      description: 'Rules for focused success in a distracted world. Deep work is the ability to focus without distraction on a cognitively demanding task.',
      isRead: false,
      createdAt: Date.now() - 5000000,
      updatedAt: Date.now() - 5000000
    }
  ];

  // --- DOM Elements ---
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const openAddModalBtn = document.getElementById('openAddModalBtn');
  const emptyAddBtn = document.getElementById('emptyAddBtn');
  const loadSamplesBtn = document.getElementById('loadSamplesBtn');
  const resetSearchBtn = document.getElementById('resetSearchBtn');

  // Stats Elements
  const totalBooksCount = document.getElementById('totalBooksCount');
  const readBooksCount = document.getElementById('readBooksCount');
  const unreadBooksCount = document.getElementById('unreadBooksCount');
  const progressPercentage = document.getElementById('progressPercentage');
  const progressBar = document.getElementById('progressBar');

  // Search & Filter Elements
  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const filterPills = document.querySelectorAll('.pill');
  const sortSelect = document.getElementById('sortSelect');

  // Display Containers
  const booksContainer = document.getElementById('booksContainer');
  const emptyLibraryState = document.getElementById('emptyLibraryState');
  const noResultsState = document.getElementById('noResultsState');
  const noResultsMessage = document.getElementById('noResultsMessage');

  // Book Modal & Form Elements
  const bookModal = document.getElementById('bookModal');
  const bookForm = document.getElementById('bookForm');
  const modalTitle = document.getElementById('modalTitle');
  const bookIdInput = document.getElementById('bookIdInput');
  const titleInput = document.getElementById('titleInput');
  const authorInput = document.getElementById('authorInput');
  const coverUrlInput = document.getElementById('coverUrlInput');
  const coverFileInput = document.getElementById('coverFileInput');
  const coverPreviewWrap = document.getElementById('coverPreviewWrap');
  const coverPreviewImg = document.getElementById('coverPreviewImg');
  const removeCoverBtn = document.getElementById('removeCoverBtn');
  const descriptionInput = document.getElementById('descriptionInput');
  const readStatusInput = document.getElementById('readStatusInput');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const cancelModalBtn = document.getElementById('cancelModalBtn');
  const titleError = document.getElementById('titleError');
  const authorError = document.getElementById('authorError');

  // Delete Confirm Modal Elements
  const deleteModal = document.getElementById('deleteModal');
  const deleteModalMessage = document.getElementById('deleteModalMessage');
  const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

  // Toast
  const toast = document.getElementById('toast');
  let toastTimer = null;

  // --- Storage Helper Functions ---
  function loadBooksFromStorage() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (err) {
      console.error('Failed to read books from localStorage:', err);
    }
    return [];
  }

  function saveBooksToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
    } catch (err) {
      console.error('Failed to save books to localStorage:', err);
      showToast('Storage error: could not save book data', 'danger');
    }
  }

  // --- Theme Management ---
  function initTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme) {
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initialTheme = prefersDark ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', initialTheme);
    }
  }

  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem(THEME_KEY, newTheme);
  }

  // --- Toast Feedback ---
  function showToast(message, type = 'success') {
    if (!toast) return;
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.className = `toast toast-${type} show`;
    toastTimer = setTimeout(() => {
      toast.className = 'toast';
    }, 3000);
  }

  // --- Stats Calculation & Reading Progress ---
  function updateStats() {
    const total = books.length;
    const read = books.filter(b => b.isRead).length;
    const unread = total - read;
    const percentage = total > 0 ? Math.round((read / total) * 100) : 0;

    totalBooksCount.textContent = total;
    readBooksCount.textContent = read;
    unreadBooksCount.textContent = unread;
    progressPercentage.textContent = `${percentage}%`;
    progressBar.style.width = `${percentage}%`;
  }

  // --- Security & HTML Escaping ---
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // --- Filtering & Sorting ---
  function getFilteredAndSortedBooks() {
    let result = [...books];

    // Filter by read / unread
    if (currentFilter === 'read') {
      result = result.filter(b => b.isRead);
    } else if (currentFilter === 'unread') {
      result = result.filter(b => !b.isRead);
    }

    // Search query
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      result = result.filter(b => {
        const title = (b.title || '').toLowerCase();
        const author = (b.author || '').toLowerCase();
        const desc = (b.description || '').toLowerCase();
        return title.includes(query) || author.includes(query) || desc.includes(query);
      });
    }

    // Sorting
    result.sort((a, b) => {
      switch (currentSort) {
        case 'newest':
          return (b.createdAt || 0) - (a.createdAt || 0);
        case 'oldest':
          return (a.createdAt || 0) - (b.createdAt || 0);
        case 'title-asc':
          return (a.title || '').localeCompare(b.title || '');
        case 'title-desc':
          return (b.title || '').localeCompare(a.title || '');
        case 'author-asc':
          return (a.author || '').localeCompare(b.author || '');
        default:
          return 0;
      }
    });

    return result;
  }

  // --- Render Book Card DOM ---
  function renderBookCard(book) {
    const card = document.createElement('article');
    card.className = 'book-card';
    card.setAttribute('data-id', book.id);

    const isRead = !!book.isRead;
    const statusText = isRead ? 'Read' : 'To Read';
    const statusClass = isRead ? 'status-read' : 'status-unread';
    const statusActionLabel = isRead ? 'Mark as Unread' : 'Mark as Read';

    const safeTitle = escapeHtml(book.title);
    const safeAuthor = escapeHtml(book.author);
    const safeDesc = escapeHtml(book.description || '');

    // Cover markup: use image if available, else stylish placeholder
    const coverHtml = (book.cover && book.cover.trim())
      ? `<img class="book-cover-img" src="${escapeHtml(book.cover)}" alt="Cover of ${safeTitle}" loading="lazy">`
      : createPlaceholderHtml(safeTitle, safeAuthor);

    // Check if description is long enough to warrant an expand toggle
    const isLongDesc = (book.description || '').length > 130;

    card.innerHTML = `
      <div class="book-cover-area">
        ${coverHtml}
        <button type="button" class="status-badge ${statusClass}" data-action="toggle-read" title="Click to change read status">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            ${isRead 
              ? '<polyline points="20 6 9 17 4 12"></polyline>' 
              : '<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>'}
          </svg>
          <span>${statusText}</span>
        </button>
      </div>

      <div class="book-body">
        <h3 class="book-title" title="${safeTitle}">${safeTitle}</h3>
        <p class="book-author">by <span class="book-author-name">${safeAuthor}</span></p>
        
        ${safeDesc ? `<p class="book-description">${safeDesc}</p>` : '<p class="book-description" style="font-style: italic; opacity: 0.6;">No description provided.</p>'}
        ${isLongDesc ? `<button type="button" class="desc-toggle" data-action="toggle-desc">Show more</button>` : ''}

        <div class="book-actions">
          <button type="button" class="btn-toggle-read" data-action="toggle-read">
            ${statusActionLabel}
          </button>
          <div class="action-btn-group">
            <button type="button" class="btn-icon-action" data-action="edit" title="Edit book" aria-label="Edit ${safeTitle}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button type="button" class="btn-icon-action delete-action" data-action="delete" title="Delete book" aria-label="Delete ${safeTitle}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;

    // Safe fallback if cover image fails to load
    const img = card.querySelector('.book-cover-img');
    if (img) {
      img.addEventListener('error', () => {
        const coverArea = card.querySelector('.book-cover-area');
        if (coverArea) {
          img.remove();
          coverArea.insertAdjacentHTML('afterbegin', createPlaceholderHtml(safeTitle, safeAuthor));
        }
      });
    }

    return card;
  }

  // Fallback placeholder cover generator
  function createPlaceholderHtml(title, author) {
    return `
      <div class="cover-placeholder">
        <div class="cover-placeholder-title">${title}</div>
        <div class="cover-placeholder-author">${author}</div>
        <div class="cover-placeholder-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-0.5-0.05"></path>
            <path d="M6 2v20"></path>
          </svg>
        </div>
      </div>
    `;
  };

  // --- Main Render Function ---
  function render() {
    updateStats();

    const filtered = getFilteredAndSortedBooks();

    // Condition 1: Entire library is completely empty
    if (books.length === 0) {
      booksContainer.style.display = 'none';
      booksContainer.innerHTML = '';
      noResultsState.style.display = 'none';
      emptyLibraryState.style.display = 'flex';
      return;
    }

    emptyLibraryState.style.display = 'none';

    // Condition 2: Search/Filter returned 0 results
    if (filtered.length === 0) {
      booksContainer.style.display = 'none';
      booksContainer.innerHTML = '';
      noResultsState.style.display = 'flex';
      
      const query = searchQuery.trim();
      if (query && currentFilter !== 'all') {
        noResultsMessage.textContent = `No ${currentFilter} books found matching "${query}".`;
      } else if (query) {
        noResultsMessage.textContent = `No books found matching "${query}".`;
      } else {
        noResultsMessage.textContent = `You have no ${currentFilter} books right now.`;
      }
      return;
    }

    // Condition 3: Display matching books
    noResultsState.style.display = 'none';
    booksContainer.style.display = 'grid';
    booksContainer.innerHTML = '';

    const fragment = document.createDocumentFragment();
    filtered.forEach(book => {
      fragment.appendChild(renderBookCard(book));
    });
    booksContainer.appendChild(fragment);
  }

  // --- Cover Preview Handling ---
  function updateCoverPreview(src) {
    if (src && src.trim()) {
      coverPreviewImg.src = src;
      coverPreviewWrap.style.display = 'flex';
      coverPreviewImg.onerror = () => {
        coverPreviewWrap.style.display = 'none';
      };
    } else {
      coverPreviewImg.src = '';
      coverPreviewWrap.style.display = 'none';
    }
  }

  coverUrlInput.addEventListener('input', () => {
    activeCoverDataUrl = ''; // Clear file if user types URL
    updateCoverPreview(coverUrlInput.value.trim());
  });

  coverFileInput.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showToast('Image file too large (max 2MB)', 'danger');
        coverFileInput.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        activeCoverDataUrl = event.target.result;
        coverUrlInput.value = ''; // Clear URL input
        updateCoverPreview(activeCoverDataUrl);
      };
      reader.readAsDataURL(file);
    }
  });

  removeCoverBtn.addEventListener('click', () => {
    coverUrlInput.value = '';
    coverFileInput.value = '';
    activeCoverDataUrl = '';
    updateCoverPreview('');
  });

  // --- Modal Open / Close ---
  function openAddModal() {
    modalTitle.textContent = 'Add New Book';
    bookForm.reset();
    bookIdInput.value = '';
    activeCoverDataUrl = '';
    updateCoverPreview('');
    clearValidationErrors();
    bookModal.style.display = 'flex';
    titleInput.focus();
  }

  function openEditModal(book) {
    modalTitle.textContent = 'Edit Book';
    clearValidationErrors();

    bookIdInput.value = book.id;
    titleInput.value = book.title || '';
    authorInput.value = book.author || '';
    
    // Check if cover is base64 or URL
    if (book.cover && book.cover.startsWith('data:image/')) {
      activeCoverDataUrl = book.cover;
      coverUrlInput.value = '';
    } else {
      activeCoverDataUrl = '';
      coverUrlInput.value = book.cover || '';
    }
    coverFileInput.value = '';
    updateCoverPreview(book.cover || '');

    descriptionInput.value = book.description || '';
    readStatusInput.checked = !!book.isRead;

    bookModal.style.display = 'flex';
    titleInput.focus();
  }

  function closeModal() {
    bookModal.style.display = 'none';
    bookForm.reset();
    clearValidationErrors();
  }

  function clearValidationErrors() {
    titleInput.classList.remove('error');
    authorInput.classList.remove('error');
    titleError.classList.remove('active');
    authorError.classList.remove('active');
  }

  // --- Form Validation & Submission ---
  bookForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const title = titleInput.value.trim();
    const author = authorInput.value.trim();
    let hasError = false;

    if (!title) {
      titleInput.classList.add('error');
      titleError.classList.add('active');
      hasError = true;
    } else {
      titleInput.classList.remove('error');
      titleError.classList.remove('active');
    }

    if (!author) {
      authorInput.classList.add('error');
      authorError.classList.add('active');
      hasError = true;
    } else {
      authorInput.classList.remove('error');
      authorError.classList.remove('active');
    }

    if (hasError) return;

    // Determine cover: prioritize uploaded file data URL, then URL input
    const cover = activeCoverDataUrl || coverUrlInput.value.trim();
    const description = descriptionInput.value.trim();
    const isRead = readStatusInput.checked;
    const existingId = bookIdInput.value;

    if (existingId) {
      // Edit existing book
      const index = books.findIndex(b => b.id === existingId);
      if (index !== -1) {
        books[index] = {
          ...books[index],
          title,
          author,
          cover,
          description,
          isRead,
          updatedAt: Date.now()
        };
        saveBooksToStorage();
        showToast(`Updated "${title}"`);
      }
    } else {
      // Create new book
      const newBook = {
        id: 'book_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        title,
        author,
        cover,
        description,
        isRead,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      books.unshift(newBook);
      saveBooksToStorage();
      showToast(`Added "${title}" to library!`);
    }

    closeModal();
    render();
  });

  // --- Delete Book with Confirmation ---
  function openDeleteConfirmModal(book) {
    pendingDeleteId = book.id;
    deleteModalMessage.textContent = `Are you sure you want to delete "${book.title}"? This action cannot be undone.`;
    deleteModal.style.display = 'flex';
    confirmDeleteBtn.focus();
  }

  function closeDeleteModal() {
    deleteModal.style.display = 'none';
    pendingDeleteId = null;
  }

  confirmDeleteBtn.addEventListener('click', () => {
    if (!pendingDeleteId) return;

    const book = books.find(b => b.id === pendingDeleteId);
    const bookTitle = book ? book.title : 'Book';

    books = books.filter(b => b.id !== pendingDeleteId);
    saveBooksToStorage();
    closeDeleteModal();
    render();
    showToast(`Deleted "${bookTitle}"`, 'danger');
  });

  cancelDeleteBtn.addEventListener('click', closeDeleteModal);

  // --- Toggle Read Status ---
  function toggleBookReadStatus(bookId) {
    const book = books.find(b => b.id === bookId);
    if (!book) return;

    book.isRead = !book.isRead;
    book.updatedAt = Date.now();
    saveBooksToStorage();
    render();

    const statusLabel = book.isRead ? 'read' : 'unread';
    showToast(`Marked "${book.title}" as ${statusLabel}`);
  }

  // --- Card Action Delegation ---
  booksContainer.addEventListener('click', (e) => {
    const actionBtn = e.target.closest('[data-action]');
    if (!actionBtn) return;

    const card = actionBtn.closest('.book-card');
    if (!card) return;

    const bookId = card.getAttribute('data-id');
    const book = books.find(b => b.id === bookId);
    if (!book) return;

    const action = actionBtn.getAttribute('data-action');

    if (action === 'toggle-read') {
      toggleBookReadStatus(bookId);
    } else if (action === 'edit') {
      openEditModal(book);
    } else if (action === 'delete') {
      openDeleteConfirmModal(book);
    } else if (action === 'toggle-desc') {
      const descEl = card.querySelector('.book-description');
      if (descEl) {
        const isExpanded = descEl.classList.toggle('expanded');
        actionBtn.textContent = isExpanded ? 'Show less' : 'Show more';
      }
    }
  });

  // --- Filter Pills ---
  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentFilter = pill.getAttribute('data-filter') || 'all';
      render();
    });
  });

  // --- Sorting ---
  sortSelect.addEventListener('change', (e) => {
    currentSort = e.target.value;
    render();
  });

  // --- Search Input ---
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    clearSearchBtn.style.display = searchQuery ? 'block' : 'none';
    render();
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    clearSearchBtn.style.display = 'none';
    searchInput.focus();
    render();
  });

  resetSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    clearSearchBtn.style.display = 'none';
    currentFilter = 'all';
    filterPills.forEach(p => {
      p.classList.toggle('active', p.getAttribute('data-filter') === 'all');
    });
    render();
  });

  // --- Load Sample Books ---
  loadSamplesBtn.addEventListener('click', () => {
    books = JSON.parse(JSON.stringify(SAMPLE_BOOKS));
    saveBooksToStorage();
    render();
    showToast('Loaded 4 sample books!');
  });

  // --- Modal Open / Close Events ---
  openAddModalBtn.addEventListener('click', openAddModal);
  emptyAddBtn.addEventListener('click', openAddModal);
  closeModalBtn.addEventListener('click', closeModal);
  cancelModalBtn.addEventListener('click', closeModal);

  // Close modals when clicking backdrop
  window.addEventListener('click', (e) => {
    if (e.target === bookModal) closeModal();
    if (e.target === deleteModal) closeDeleteModal();
  });

  // Keyboard accessibility: Escape closes any open modal
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (bookModal.style.display === 'flex') closeModal();
      if (deleteModal.style.display === 'flex') closeDeleteModal();
    }
  });

  // Theme Toggle Button
  themeToggleBtn.addEventListener('click', toggleTheme);

  // --- Initialization ---
  function init() {
    initTheme();
    books = loadBooksFromStorage();
    render();
  }

  init();
})();
