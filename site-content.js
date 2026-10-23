(() => {
  const api = window.TaraSupabaseAPI;
  if (!api?.configured) return;

  const loadRows = async table => {
    const { data, error } = await api.client
      .from(table)
      .select('*')
      .order('order_index', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data;
  };

  const makeImage = (url, alt, className) => {
    const image = document.createElement('img');
    image.src = url;
    image.alt = alt;
    image.className = className;
    image.loading = 'lazy';
    image.decoding = 'async';
    return image;
  };

  const renderGallery = rows => {
    const gallery = document.getElementById('projectGallery');
    if (!gallery) return;
    const fragment = document.createDocumentFragment();
    rows.forEach(project => {
      const card = document.createElement('article');
      card.className = 'project-card reveal is-visible overflow-hidden rounded-lg border border-gray-200 bg-white shadow-card';
      const imageFrame = document.createElement('div');
      imageFrame.className = 'h-40 overflow-hidden bg-gray-100';
      imageFrame.append(makeImage(project.image_url, project.title, 'project-image h-full w-full object-cover'));
      const details = document.createElement('div');
      details.className = 'flex items-end justify-between gap-3 p-4';
      const text = document.createElement('div');
      const category = document.createElement('p');
      category.className = 'text-[10px] font-bold uppercase tracking-wider text-blue-600';
      category.textContent = project.category;
      const title = document.createElement('h3');
      title.className = 'mt-1.5 text-lg font-extrabold';
      title.textContent = project.title;
      text.append(category, title);
      const link = document.createElement('a');
      link.href = '#contact';
      link.className = 'grid h-9 w-9 shrink-0 place-items-center bg-yellow-400 hover:bg-yellow-300';
      link.setAttribute('aria-label', `Discuss a ${project.title} project`);
      link.innerHTML = '<i data-lucide="arrow-up-right" class="h-4 w-4"></i>';
      details.append(text, link);
      card.append(imageFrame, details);
      fragment.append(card);
    });
    gallery.replaceChildren(fragment);
    window.lucide?.createIcons();
  };

  const renderTeam = rows => {
    const grid = document.getElementById('teamMembersGrid');
    if (!grid) return;
    const fragment = document.createDocumentFragment();
    rows.forEach(member => {
      const card = document.createElement('article');
      card.className = 'reveal is-visible overflow-hidden rounded-lg border border-yellow-400/60 bg-white p-5 shadow-card';
      card.append(makeImage(member.image_url || '', member.name, 'h-64 w-full rounded-2xl object-cover'));

      const links = document.createElement('div');
      links.className = 'mt-3 flex items-center gap-2';
      links.setAttribute('aria-label', `${member.name} outreach links`);
      const whatsapp = document.createElement('a');
      whatsapp.className = 'grid h-8 w-8 place-items-center rounded-xl border-[0.5px] border-gray-200 text-[#1e9e4a] transition hover:border-yellow-400 hover:bg-yellow-400 hover:text-blue-950';
      whatsapp.href = `https://wa.me/211929150111?text=${encodeURIComponent(`Hello Tara Tech, I would like to speak with ${member.name}.`)}`;
      whatsapp.target = '_blank';
      whatsapp.rel = 'noopener noreferrer';
      whatsapp.setAttribute('aria-label', `Contact ${member.name} on WhatsApp`);
      whatsapp.title = 'WhatsApp';
      whatsapp.innerHTML = '<i class="bi bi-whatsapp" aria-hidden="true"></i>';
      const email = document.createElement('a');
      email.className = 'grid h-8 w-8 place-items-center rounded-xl border-[0.5px] border-gray-200 text-gray-600 transition hover:border-yellow-400 hover:bg-yellow-400 hover:text-blue-950';
      email.href = `mailto:tara.tech211@gmail.com?subject=${encodeURIComponent(`Message for ${member.name}`)}`;
      email.setAttribute('aria-label', `Email ${member.name}`);
      email.title = 'Email';
      email.innerHTML = '<i class="bi bi-envelope" aria-hidden="true"></i>';
      const linkedIn = document.createElement('a');
      linkedIn.className = 'grid h-8 w-8 place-items-center rounded-xl border-[0.5px] border-gray-200 text-[#0a66c2] transition hover:border-yellow-400 hover:bg-yellow-400 hover:text-blue-950';
      const linkedInProfiles = {
        'Kiir David': 'https://www.linkedin.com/in/kiir-david-aa5210331',
        'Ateng Aguto': 'https://www.linkedin.com/in/ateng-aguto-anok/'
      };
      linkedIn.href = linkedInProfiles[member.name]
        || `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(member.name)}`;
      linkedIn.target = '_blank';
      linkedIn.rel = 'noopener noreferrer';
      linkedIn.setAttribute('aria-label', `Find ${member.name} on LinkedIn`);
      linkedIn.title = 'LinkedIn';
      linkedIn.innerHTML = '<i class="bi bi-linkedin" aria-hidden="true"></i>';
      links.append(whatsapp, email, linkedIn);

      const name = document.createElement('h3');
      name.className = 'mt-5 text-2xl font-extrabold';
      name.textContent = member.name;
      const role = document.createElement('p');
      role.className = 'mt-2 text-xs font-extrabold uppercase tracking-[0.12em] text-blue-600';
      role.textContent = member.role;
      const bio = document.createElement('h4');
      bio.className = 'mt-2 text-sm font-semibold text-gray-500';
      bio.textContent = member.bio || '';
      card.append(links, name, role, bio);
      fragment.append(card);
    });
    grid.replaceChildren(fragment);
  };

  const renderSlides = rows => {
    const slider = document.getElementById('heroSlider');
    if (!slider) return;
    const badge = slider.querySelector(':scope > div');
    const fragment = document.createDocumentFragment();
    rows.forEach((slide, index) => {
      const image = makeImage(
        slide.image_url,
        slide.alt_text,
        `hero-slide h-full w-full object-cover object-center${index === 0 ? ' is-active' : ''}`
      );
      fragment.append(image);
    });
    slider.replaceChildren(fragment);
    if (badge) slider.append(badge);
  };

  document.addEventListener('DOMContentLoaded', () => {
    const loadSection = async (table, render) => {
      try {
        render(await loadRows(table));
      } catch (error) {
        console.error(`Unable to load ${table}. Run supabase-content-management.sql in Supabase to enable editable site content.`, error);
      }
    };
    loadSection('gallery_projects', renderGallery);
    loadSection('team', renderTeam);
    loadSection('hero_slides', renderSlides);
  }, { once: true });
})();
