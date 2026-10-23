(() => {
  const config = window.TARA_SUPABASE;
  const api = window.TaraSupabaseAPI;
  const configured = config
    && config.url.startsWith('https://')
    && !config.url.includes('YOUR_')
    && config.anonKey
    && !config.anonKey.includes('YOUR_');

  const loginView = document.getElementById('loginView');
  const recoveryView = document.getElementById('recoveryView');
  const dashboardView = document.getElementById('dashboardView');
  const loginForm = document.getElementById('loginForm');
  const loginStatus = document.getElementById('loginStatus');
  const recoveryForm = document.getElementById('recoveryForm');
  const recoveryStatus = document.getElementById('recoveryStatus');
  const postForm = document.getElementById('postForm');
  const editorStatus = document.getElementById('editorStatus');
  const postsStatus = document.getElementById('postsStatus');
  const postsList = document.getElementById('postsList');
  const postCount = document.getElementById('postCount');
  const inquiriesList = document.getElementById('inquiriesList');
  const inquiriesStatus = document.getElementById('inquiriesStatus');
  const inquiryCount = document.getElementById('inquiryCount');
  const imageInput = document.getElementById('imageInput');
  const imagePreview = document.getElementById('imagePreview');
  const imageEmpty = document.getElementById('imageEmpty');
  const imageStatus = document.getElementById('imageStatus');
  const removeImageButton = document.getElementById('removeImageButton');
  const newPostButton = document.getElementById('newPostButton');
  const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
  let client;
  let currentUser;
  let posts = [];
  let previewUrl = '';
  let slugEdited = false;
  const recoveryRequested = window.location.hash.includes('type=recovery');
  const managedItems = { gallery: [], team: [], slides: [] };
  const managedPreviewUrls = { gallery: '', team: '', slides: '' };
  const managedEditors = {
    gallery: {
      collection: 'gallery',
      itemLabel: 'gallery project',
      listId: 'galleryList',
      statusId: 'galleryStatus',
      formId: 'galleryForm',
      idId: 'galleryId',
      imageId: 'galleryImage',
      previewId: 'galleryPreview',
      imageStatusId: 'galleryImageStatus',
      editorTitleId: 'galleryEditorTitle',
      newButtonId: 'newGalleryButton',
      addTitle: 'Add gallery project',
      editTitle: 'Edit gallery project',
      primary: item => item.title,
      secondary: item => item.category,
      values: (id, item) => ({
        title: document.getElementById('galleryTitle').value.trim(),
        category: document.getElementById('galleryCategory').value.trim(),
        order_index: item?.order_index ?? managedItems.gallery.length
      }),
      fill: item => {
        document.getElementById('galleryTitle').value = item.title;
        document.getElementById('galleryCategory').value = item.category;
      }
    },
    team: {
      collection: 'team',
      itemLabel: 'team member',
      listId: 'teamList',
      statusId: 'teamStatus',
      formId: 'teamForm',
      idId: 'teamId',
      imageId: 'teamImage',
      previewId: 'teamPreview',
      imageStatusId: 'teamImageStatus',
      editorTitleId: 'teamEditorTitle',
      newButtonId: 'newTeamButton',
      addTitle: 'Add team member',
      editTitle: 'Edit team member',
      primary: item => item.name,
      secondary: item => `${item.role}${item.bio ? ' · ' + item.bio : ''}`,
      values: (id, item) => ({
        name: document.getElementById('teamName').value.trim(),
        role: document.getElementById('teamRole').value.trim(),
        bio: document.getElementById('teamBio').value.trim(),
        order_index: item?.order_index ?? managedItems.team.length
      }),
      fill: item => {
        document.getElementById('teamName').value = item.name;
        document.getElementById('teamRole').value = item.role;
        document.getElementById('teamBio').value = item.bio || '';
      }
    },
    slides: {
      collection: 'slides',
      itemLabel: 'hero slide',
      listId: 'slideList',
      statusId: 'slideStatus',
      formId: 'slideForm',
      idId: 'slideId',
      imageId: 'slideImage',
      previewId: 'slidePreview',
      imageStatusId: 'slideImageStatus',
      editorTitleId: 'slideEditorTitle',
      newButtonId: 'newSlideButton',
      addTitle: 'Add hero slide',
      editTitle: 'Edit hero slide',
      primary: item => item.alt_text,
      secondary: () => 'Homepage hero image',
      values: (id, item) => ({
        alt_text: document.getElementById('slideAlt').value.trim(),
        order_index: item?.order_index ?? managedItems.slides.length
      }),
      fill: item => {
        document.getElementById('slideAlt').value = item.alt_text;
      }
    }
  };

  const getAdminRedirectUrl = () => {
    if (!['http:', 'https:'].includes(window.location.protocol)) return '';
    return new URL('admin.html', window.location.href).href;
  };

  const setVisible = (element, visible, displayClass = 'inline-flex') => {
    element.classList.toggle('hidden', !visible);
    element.classList.toggle(displayClass, visible);
  };

  const slugify = value => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const clearPreviewUrl = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = '';
  };

  const showImage = (source, message = '') => {
    imagePreview.src = source;
    imagePreview.hidden = false;
    imageEmpty.hidden = true;
    setVisible(removeImageButton, true);
    imageStatus.textContent = message;
  };

  const clearImage = ({ clearStored = true } = {}) => {
    clearPreviewUrl();
    imageInput.value = '';
    imagePreview.removeAttribute('src');
    imagePreview.hidden = true;
    imageEmpty.hidden = false;
    setVisible(removeImageButton, false);
    if (clearStored) {
      document.getElementById('existingImageUrl').value = '';
      document.getElementById('existingImagePath').value = '';
    }
  };

  const resetEditor = () => {
    postForm.reset();
    document.getElementById('postId').value = '';
    document.getElementById('existingImageUrl').value = '';
    document.getElementById('existingImagePath').value = '';
    document.getElementById('editorTitle').textContent = 'Create post';
    editorStatus.textContent = '';
    imageStatus.textContent = '';
    slugEdited = false;
    clearImage();
    setVisible(newPostButton, false);
  };

  const showLogin = message => {
    dashboardView.hidden = true;
    recoveryView.hidden = true;
    loginView.hidden = false;
    loginStatus.textContent = message || '';
    window.lucide?.createIcons();
  };

  const showDashboard = async user => {
    currentUser = user;
    loginView.hidden = true;
    recoveryView.hidden = true;
    dashboardView.hidden = false;
    window.lucide?.createIcons();
    resetEditor();
    await loadPosts();
    await loadInquiries();
    await Promise.all(Object.keys(managedEditors).map(loadManagedItems));
  };

  const createInquiryListItem = inquiry => {
    const item = document.createElement('article');
    item.className = 'rounded-lg border border-gray-200 p-4';
    const header = document.createElement('div');
    header.className = 'flex items-start justify-between gap-2';
    const heading = document.createElement('p');
    heading.className = 'text-sm font-extrabold text-ink';
    heading.textContent = inquiry.name;
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'grid h-7 w-7 shrink-0 place-items-center rounded-md border border-red-200 text-red-600 hover:bg-red-50';
    deleteBtn.type = 'button';
    deleteBtn.setAttribute('aria-label', 'Delete inquiry');
    deleteBtn.innerHTML = '<i data-lucide="x" class="h-3.5 w-3.5"></i>';
    deleteBtn.addEventListener('click', async () => {
      if (!window.confirm('Delete this inquiry?')) return;
      inquiriesStatus.textContent = 'Deleting...';
      try {
        await api.deleteInquiry(inquiry.id);
        await loadInquiries();
      } catch (error) {
        inquiriesStatus.textContent = error.message || 'Unable to delete.';
      }
    });
    header.append(heading, deleteBtn);
    const meta = document.createElement('p');
    meta.className = 'mt-1 text-xs font-semibold text-gray-500';
    meta.textContent = inquiry.email + (inquiry.phone ? ' · ' + inquiry.phone : '');
    const message = document.createElement('p');
    message.className = 'mt-2 text-sm leading-6 text-gray-600';
    message.textContent = inquiry.message;
    const created = document.createElement('p');
    created.className = 'mt-3 text-xs text-gray-500';
    created.textContent = new Date(inquiry.created_at).toLocaleString();
    item.append(header, meta, message, created);
    return item;
  };

  const loadInquiries = async () => {
    if (!inquiriesList || !inquiriesStatus || !inquiryCount) return;
    inquiriesStatus.textContent = 'Loading inquiries...';
    try {
      const inquiries = await api.fetchInquiries();
      inquiryCount.textContent = String(inquiries.length);
      inquiriesStatus.textContent = inquiries.length ? '' : 'No inquiries yet.';
      const fragment = document.createDocumentFragment();
      inquiries.slice(0, 20).forEach(inquiry => fragment.append(createInquiryListItem(inquiry)));
      inquiriesList.replaceChildren(fragment);
    } catch (error) {
      inquiriesStatus.textContent = error.message || 'Unable to load inquiries.';
    }
  };

  const verifyAdmin = async () => {
    try { return await api.checkAdminStatus(); }
    catch (error) { console.error(error); return false; }
  };

  const requireAdmin = async user => {
    if (user && await verifyAdmin(user)) {
      await showDashboard(user);
      return;
    }
    if (user) await client.auth.signOut();
    showLogin(user ? 'This account is not authorized for the dashboard.' : '');
  };

  const createPostListItem = post => {
    const item = document.createElement('article');
    item.className = 'rounded-lg border border-gray-200 p-4';
    const meta = document.createElement('p');
    meta.className = 'text-xs font-extrabold uppercase tracking-[0.12em] text-blue-600';
    meta.textContent = post.kind + ' · ' + post.status;
    const title = document.createElement('h3');
    title.className = 'mt-2 font-extrabold';
    title.textContent = post.title;
    const updated = document.createElement('p');
    updated.className = 'mt-2 text-xs text-gray-500';
    updated.textContent = 'Updated ' + new Date(post.updated_at).toLocaleString();
    const actions = document.createElement('div');
    actions.className = 'mt-4 flex gap-2';
    const editBtn = document.createElement('button');
    editBtn.className = 'rounded-lg border border-gray-300 px-3 py-2 text-xs font-bold hover:bg-gray-50';
    editBtn.type = 'button';
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', () => editPost(post.id));
    const delBtn = document.createElement('button');
    delBtn.className = 'rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50';
    delBtn.type = 'button';
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', () => deletePost(post.id));
    actions.append(editBtn, delBtn);
    item.append(meta, title, updated, actions);
    return item;
  };

  const renderPosts = () => {
    const fragment = document.createDocumentFragment();
    posts.forEach(post => fragment.append(createPostListItem(post)));
    postsList.replaceChildren(fragment);
    postCount.textContent = String(posts.length);
    postsStatus.textContent = posts.length ? '' : 'No posts yet.';
  };

  const loadPosts = async () => {
    postsStatus.textContent = 'Loading posts...';
    try {
      const [newsResult, eventsResult] = await Promise.all([
        client.from('news').select('*').order('created_at', { ascending: false }),
        client.from('events').select('*').order('event_date', { ascending: false })
      ]);
      if (newsResult.error) throw newsResult.error;
      if (eventsResult.error) throw eventsResult.error;
      const newsPosts = newsResult.data.map(item => ({
        ...item, kind: 'News', status: 'published', description: item.content.slice(0, 320),
        published_at: item.created_at, updated_at: item.created_at
      }));
      const eventPosts = eventsResult.data.map(item => ({
        ...item, kind: 'Event', status: 'published', slug: '', content: item.description, description: item.location,
        published_at: item.event_date, updated_at: item.created_at
      }));
      posts = [...newsPosts, ...eventPosts].sort((left, right) => new Date(right.updated_at) - new Date(left.updated_at));
      renderPosts();
    } catch (error) {
      postsStatus.textContent = error.message || 'Unable to load content.';
    }
  };

  const editPost = id => {
    const post = posts.find(item => item.id === id);
    if (!post) return;
    document.getElementById('postId').value = post.id;
    document.getElementById('postKind').value = post.kind;
    document.getElementById('postStatus').value = post.status;
    document.getElementById('postTitle').value = post.title;
    document.getElementById('postSlug').value = post.slug || slugify(post.title);
    document.getElementById('postDescription').value = post.description;
    document.getElementById('postContent').value = post.content;
    document.getElementById('publishedAt').value = post.published_at ? new Date(post.published_at).toISOString().slice(0, 16) : '';
    document.getElementById('existingImageUrl').value = post.image_url || '';
    document.getElementById('existingImagePath').value = '';
    document.getElementById('editorTitle').textContent = 'Edit post';
    slugEdited = true;
    clearImage({ clearStored: false });
    if (post.image_url) showImage(post.image_url, 'Current featured image.');
    setVisible(newPostButton, true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deletePost = async id => {
    const post = posts.find(item => item.id === id);
    if (!post || !window.confirm('Delete "' + post.title + '"? This cannot be undone.')) return;
    postsStatus.textContent = 'Deleting post...';
    try {
      if (post.kind === 'News') await api.deleteNews(id);
      else await api.deleteEvent(id);
    } catch (error) {
      postsStatus.textContent = error.message || 'Unable to delete content.';
      return;
    }
    if (document.getElementById('postId').value === id) resetEditor();
    await loadPosts();
    await loadInquiries();
  };

  const clearManagedPreview = collection => {
    const editor = managedEditors[collection];
    if (managedPreviewUrls[collection]) URL.revokeObjectURL(managedPreviewUrls[collection]);
    managedPreviewUrls[collection] = '';
    const preview = document.getElementById(editor.previewId);
    preview.removeAttribute('src');
    preview.hidden = true;
    document.getElementById(editor.imageId).value = '';
  };

  const resetManagedEditor = collection => {
    const editor = managedEditors[collection];
    document.getElementById(editor.formId).reset();
    document.getElementById(editor.idId).value = '';
    document.getElementById(editor.editorTitleId).textContent = editor.addTitle;
    document.getElementById(editor.statusId).textContent = '';
    document.getElementById(editor.imageStatusId).textContent =
      'JPG, PNG, WebP or GIF, up to 5 MB. Choose an image to use or replace the current one.';
    setVisible(document.getElementById(editor.newButtonId), false);
    clearManagedPreview(collection);
  };

  const renderManagedItems = collection => {
    const editor = managedEditors[collection];
    const list = document.getElementById(editor.listId);
    const fragment = document.createDocumentFragment();
    managedItems[collection].forEach(item => {
      const card = document.createElement('article');
      card.className = 'flex items-start gap-3 rounded-lg border border-gray-200 p-3';
      const image = document.createElement('img');
      image.className = 'h-16 w-16 shrink-0 rounded-md object-cover';
      image.src = item.image_url;
      image.alt = '';
      const content = document.createElement('div');
      content.className = 'min-w-0 flex-1';
      const heading = document.createElement('p');
      heading.className = 'break-words text-sm font-extrabold';
      heading.textContent = editor.primary(item);
      const description = document.createElement('p');
      description.className = 'mt-1 break-words text-xs text-gray-500';
      description.textContent = editor.secondary(item);
      const actions = document.createElement('div');
      actions.className = 'mt-3 flex gap-2';
      const editButton = document.createElement('button');
      editButton.className = 'rounded-md border border-gray-300 px-3 py-1.5 text-xs font-bold hover:bg-gray-50';
      editButton.type = 'button';
      editButton.textContent = 'Edit';
      editButton.addEventListener('click', () => editManagedItem(collection, item.id));
      const deleteButton = document.createElement('button');
      deleteButton.className = 'rounded-md border border-red-200 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-50';
      deleteButton.type = 'button';
      deleteButton.textContent = 'Delete';
      deleteButton.addEventListener('click', () => deleteManagedItem(collection, item));
      actions.append(editButton, deleteButton);
      content.append(heading, description, actions);
      card.append(image, content);
      fragment.append(card);
    });
    if (!managedItems[collection].length) {
      const empty = document.createElement('p');
      empty.className = 'rounded-lg border border-dashed border-gray-300 p-5 text-sm text-gray-500';
      empty.textContent = `No ${editor.itemLabel}s yet.`;
      fragment.append(empty);
    }
    list.replaceChildren(fragment);
  };

  const loadManagedItems = async collection => {
    const editor = managedEditors[collection];
    const status = document.getElementById(editor.statusId);
    status.textContent = 'Loading...';
    try {
      managedItems[collection] = await api.listManagedContent(editor.collection);
      renderManagedItems(collection);
      status.textContent = '';
    } catch (error) {
      status.textContent = `${error.message || 'Unable to load items.'} Run supabase-content-management.sql in Supabase, then refresh.`;
    }
  };

  const editManagedItem = (collection, id) => {
    const editor = managedEditors[collection];
    const item = managedItems[collection].find(candidate => candidate.id === id);
    if (!item) return;
    resetManagedEditor(collection);
    document.getElementById(editor.idId).value = item.id;
    document.getElementById(editor.editorTitleId).textContent = editor.editTitle;
    editor.fill(item);
    const preview = document.getElementById(editor.previewId);
    if (item.image_url) {
      preview.src = item.image_url;
      preview.hidden = false;
      document.getElementById(editor.imageStatusId).textContent = 'Current image. Choose another image to replace it.';
    }
    setVisible(document.getElementById(editor.newButtonId), true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteManagedItem = async (collection, item) => {
    const editor = managedEditors[collection];
    if (!window.confirm(`Delete "${editor.primary(item)}"? This cannot be undone.`)) return;
    const status = document.getElementById(editor.statusId);
    status.textContent = `Deleting ${editor.itemLabel}...`;
    try {
      await api.deleteManagedContent(editor.collection, item.id);
      if (document.getElementById(editor.idId).value === item.id) resetManagedEditor(collection);
      await loadManagedItems(collection);
    } catch (error) {
      status.textContent = error.message || `Unable to delete ${editor.itemLabel}.`;
    }
  };

  const readCurrentSiteContent = async selector => {
    const response = await fetch(new URL('/', window.location.href), { cache: 'no-store' });
    if (!response.ok) throw new Error(`Could not load the current website (HTTP ${response.status}).`);
    const document = new DOMParser().parseFromString(await response.text(), 'text/html');
    const elements = [...document.querySelectorAll(selector)];
    if (!elements.length) throw new Error('No matching content was found on the current website.');
    return elements;
  };

  const syncCurrentSiteEntries = async collection => {
    const editor = managedEditors[collection];
    const status = document.getElementById(editor.statusId);
    const isTeam = collection === 'team';
    status.textContent = `Checking the current website ${isTeam ? 'team' : 'hero slides'}...`;

    try {
      const cards = await readCurrentSiteContent(
        isTeam ? '#teamMembersGrid article' : '#heroSlider img.hero-slide'
      );
      const entries = cards.map((card, orderIndex) => {
        if (isTeam) {
          const image = card.querySelector('img');
          const name = card.querySelector('h3')?.textContent.trim();
          const role = card.querySelector('p')?.textContent.trim();
          const bio = card.querySelector('h4')?.textContent.trim() || '';
          if (!image?.getAttribute('src') || !name || !role) return null;
          return {
            name,
            role,
            bio,
            image_url: new URL(image.getAttribute('src'), new URL('/', window.location.href)).href,
            order_index: orderIndex
          };
        }

        const altText = card.getAttribute('alt')?.trim();
        const imageUrl = card.getAttribute('src');
        if (!altText || !imageUrl) return null;
        return {
          alt_text: altText,
          image_url: new URL(imageUrl, new URL('/', window.location.href)).href,
          order_index: orderIndex
        };
      }).filter(Boolean);

      if (!entries.length) throw new Error('No editable content was found in the current site section.');
      const added = await api.syncManagedContent(editor.collection, entries);
      await loadManagedItems(collection);
      status.textContent = added
        ? `Added ${added} missing ${isTeam ? 'team member(s)' : 'hero slide(s)'}. Existing edits and deletions were preserved.`
        : `All current ${isTeam ? 'team members' : 'hero slides'} are already in the admin list.`;
    } catch (error) {
      status.textContent = error.message || 'Unable to sync current site content.';
    }
  };

  const validateManagedImage = (collection, file) => {
    const status = document.getElementById(managedEditors[collection].imageStatusId);
    if (!file) return true;
    if (!allowedImageTypes.has(file.type)) {
      status.textContent = 'Choose a JPG, PNG, WebP or GIF image.';
      return false;
    }
    if (file.size > 5 * 1024 * 1024) {
      status.textContent = 'Choose an image smaller than 5 MB.';
      return false;
    }
    return true;
  };

  Object.entries(managedEditors).forEach(([collection, editor]) => {
    const form = document.getElementById(editor.formId);
    const imageInput = document.getElementById(editor.imageId);
    const imagePreview = document.getElementById(editor.previewId);
    imageInput.addEventListener('change', () => {
      const file = imageInput.files[0];
      if (!validateManagedImage(collection, file)) {
        imageInput.value = '';
        return;
      }
      if (managedPreviewUrls[collection]) URL.revokeObjectURL(managedPreviewUrls[collection]);
      managedPreviewUrls[collection] = file ? URL.createObjectURL(file) : '';
      imagePreview.src = managedPreviewUrls[collection];
      imagePreview.hidden = !file;
      document.getElementById(editor.imageStatusId).textContent = file
        ? `${file.name} selected.`
        : 'Current image. Choose another image to replace it.';
    });

    document.getElementById(editor.newButtonId).addEventListener('click', () => resetManagedEditor(collection));
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const file = imageInput.files[0];
      const id = document.getElementById(editor.idId).value;
      const status = document.getElementById(editor.statusId);
      if (!validateManagedImage(collection, file)) return;
      if (!id && !file) {
        status.textContent = 'Choose an image before saving.';
        return;
      }
      status.textContent = `Saving ${editor.itemLabel}...`;
      try {
        const existing = managedItems[collection].find(item => item.id === id);
        await api.saveManagedContent(editor.collection, id, editor.values(id, existing), file);
        resetManagedEditor(collection);
        status.textContent = `${editor.itemLabel[0].toUpperCase()}${editor.itemLabel.slice(1)} saved.`;
        await loadManagedItems(collection);
      } catch (error) {
        status.textContent = error.message || `Unable to save ${editor.itemLabel}.`;
      }
    });
  });

  document.getElementById('syncTeamButton')
    .addEventListener('click', () => syncCurrentSiteEntries('team'));
  document.getElementById('syncSlidesButton')
    .addEventListener('click', () => syncCurrentSiteEntries('slides'));

  document.querySelectorAll('[data-admin-target]').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-admin-target]').forEach(tab => {
        const selected = tab === button;
        tab.setAttribute('aria-pressed', String(selected));
        tab.classList.toggle('bg-blue-600', selected);
        tab.classList.toggle('text-white', selected);
        tab.classList.toggle('border', !selected);
        tab.classList.toggle('border-gray-300', !selected);
        tab.classList.toggle('bg-white', !selected);
      });
      ['adminSectionPosts', 'adminSectionGallery', 'adminSectionTeam', 'adminSectionSlides'].forEach(sectionId => {
        document.getElementById(sectionId).hidden = sectionId !== button.dataset.adminTarget;
      });
    });
  });

  loginForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (!configured || !window.supabase) {
      loginStatus.textContent = 'Configure supabase-config.js before signing in.';
      return;
    }
    loginStatus.textContent = 'Signing in...';
    try {
      const email = document.getElementById('loginEmail').value.trim();
      const user = await api.adminLogin(email, document.getElementById('loginPassword').value);
      await requireAdmin(user);
    } catch (error) {
      console.error('[Admin] Sign-in error:', error);
      const message = String(error?.message || error?.error_description || '');
      const lower = message.toLowerCase();
      if (lower.includes('email not confirmed')) {
        loginStatus.textContent = 'This email is not confirmed yet. Open the confirmation email in this inbox (check Spam/Junk) and click the link first.';
      } else if (lower.includes('invalid login credentials')) {
        loginStatus.textContent = 'Incorrect email or password.';
      } else if (lower.includes('too many requests')) {
        loginStatus.textContent = 'Too many sign-in attempts. Wait a minute and try again.';
      } else {
        loginStatus.textContent = message || 'Sign-in failed. Check your credentials.';
      }
    }
  });

  document.getElementById('createPasswordButton').addEventListener('click', async () => {
    if (!configured || !window.supabase) {
      loginStatus.textContent = 'Configure supabase-config.js before creating a password.';
      return;
    }
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    if (password.length < 8) {
      loginStatus.textContent = 'Enter a password with at least 8 characters.';
      return;
    }
    const redirectUrl = getAdminRedirectUrl();
    if (!redirectUrl) {
      loginStatus.textContent = 'Open this dashboard from an HTTPS website or localhost to create a password.';
      return;
    }
    loginStatus.textContent = 'Creating the company account...';
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectUrl }
    });
    if (error) {
      loginStatus.textContent = error.message;
      return;
    }
    loginStatus.textContent = data.session
      ? "Password created. Set this user's profile role to admin to enable dashboard access."
      : 'Check the company email and confirm the account, then set its profile role to admin.';
  });

  document.getElementById('forgotPasswordButton').addEventListener('click', async () => {
    if (!configured || !window.supabase) {
      loginStatus.textContent = 'Configure supabase-config.js before resetting the password.';
      return;
    }
    const redirectUrl = getAdminRedirectUrl();
    if (!redirectUrl) {
      loginStatus.textContent = 'Open this dashboard from an HTTPS website or localhost to reset the password.';
      return;
    }
    loginStatus.textContent = 'Sending a password reset email...';
    const email = document.getElementById('loginEmail').value.trim();
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl
    });
    loginStatus.textContent = error ? error.message : 'Check your inbox for the password reset link.';
  });

  recoveryForm.addEventListener('submit', async event => {
    event.preventDefault();
    const password = document.getElementById('newPassword').value;
    const confirmation = document.getElementById('confirmPassword').value;
    if (password !== confirmation) {
      recoveryStatus.textContent = 'The passwords do not match.';
      return;
    }
    recoveryStatus.textContent = 'Updating password...';
    const { data: sessionData } = await client.auth.getSession();
    if (!sessionData.session) {
      recoveryStatus.textContent = 'This recovery link is invalid or expired. Request a new password reset email.';
      return;
    }
    const { data, error } = await client.auth.updateUser({ password });
    if (error) {
      recoveryStatus.textContent = error.message;
      return;
    }
    recoveryForm.reset();
    recoveryStatus.textContent = 'Password updated.';
    await requireAdmin(data.user);
  });

  document.getElementById('deleteAllInquiriesButton').addEventListener('click', async () => {
    if (!window.confirm('Delete ALL inquiries? This cannot be undone.')) return;
    inquiriesStatus.textContent = 'Deleting all inquiries...';
    try {
      await api.deleteAllInquiries();
      await loadInquiries();
    } catch (error) {
      inquiriesStatus.textContent = error.message || 'Unable to delete inquiries.';
    }
  });

  document.getElementById('signOutButton').addEventListener('click', async () => {
    await client.auth.signOut();
    postForm.reset();
    showLogin('Signed out.');
  });

  document.getElementById('postTitle').addEventListener('input', event => {
    if (!slugEdited) document.getElementById('postSlug').value = slugify(event.target.value);
  });
  document.getElementById('postSlug').addEventListener('input', event => {
    slugEdited = true;
    event.target.value = slugify(event.target.value);
  });

  imageInput.addEventListener('change', () => {
    const file = imageInput.files[0];
    if (!file) return;
    if (!allowedImageTypes.has(file.type)) {
      imageInput.value = '';
      imageStatus.textContent = 'Choose a JPG, PNG, WebP or GIF image.';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      imageInput.value = '';
      imageStatus.textContent = 'Choose an image smaller than 5 MB.';
      return;
    }
    clearPreviewUrl();
    previewUrl = URL.createObjectURL(file);
    showImage(previewUrl, file.name + ' selected.');
  });

  removeImageButton.addEventListener('click', () => {
    clearImage();
    imageStatus.textContent = 'Featured image removed.';
  });

  newPostButton.addEventListener('click', resetEditor);

  postForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (!postForm.reportValidity()) return;
    editorStatus.textContent = 'Saving post...';
    const id = document.getElementById('postId').value;
    try {
      const file = imageInput.files[0];
      const dateValue = document.getElementById('publishedAt').value;
      const kind = document.getElementById('postKind').value;
      const title = document.getElementById('postTitle').value.trim();
      const description = document.getElementById('postDescription').value.trim();
      const content = document.getElementById('postContent').value.trim();
      if (kind === 'News') {
        if (id) await api.updateNews(id, title, content, file);
        else await api.postNews(title, content, file);
      } else {
        const details = { title, description: content, date: dateValue || new Date().toISOString(), location: description };
        if (id) await api.updateEvent(id, details, file);
        else await api.createEvent(title, content, details.date, description, file);
      }
      resetEditor();
      editorStatus.textContent = 'Post saved.';
      await loadPosts();
      await loadInquiries();
    } catch (error) {
      editorStatus.textContent = error.message || 'Unable to save the post.';
    }
  });

  // Password visibility toggles - event delegation
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-toggle]');
    if (!button) return;
    const input = document.getElementById(button.dataset.toggle);
    if (!input) return;
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    button.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
    button.innerHTML = '<i data-lucide="' + (isPassword ? 'eye-off' : 'eye') + '" class="h-4 w-4 text-gray-500"></i>';
    window.lucide?.createIcons();
  });

  window.addEventListener('pagehide', () => {
    clearPreviewUrl();
    Object.keys(managedPreviewUrls).forEach(clearManagedPreview);
  }, { once: true });

  const initialize = async () => {
    window.lucide?.createIcons();
    if (!configured || !window.supabase) {
      showLogin('Configure supabase-config.js before signing in.');
      return;
    }
    client = api.client;
    client.auth.onAuthStateChange(event => {
      if (event !== 'PASSWORD_RECOVERY') return;
      loginView.hidden = true;
      dashboardView.hidden = true;
      recoveryView.hidden = false;
      recoveryStatus.textContent = '';
      window.lucide?.createIcons();
    });
    const { data } = await client.auth.getSession();
    if (recoveryRequested) {
      if (!data.session) {
        showLogin('This recovery link is invalid or expired. Request a new password reset email.');
        return;
      }
      loginView.hidden = true;
      dashboardView.hidden = true;
      recoveryView.hidden = false;
      window.lucide?.createIcons();
      return;
    }
    await requireAdmin(data.session?.user);
  };

  initialize();
})();