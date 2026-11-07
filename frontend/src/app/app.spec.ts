import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { AuthService } from './core/auth.service';
import { LocaleService } from './core/locale.service';
import { WeddingDataService } from './core/wedding-data.service';
import { FakeApi, fakeApiInterceptor } from '../testing/fake-api';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes), provideHttpClient(withInterceptors([fakeApiInterceptor]))],
    }).compileComponents();
    await TestBed.inject(AuthService).login('admin@vows.local', 'vows-admin');
  });

  afterEach(() => {
    TestBed.inject(AuthService).logout();
    // Language and currency are remembered in storage; start every test in English and USD.
    localStorage.removeItem('vows.locale');
  });

  async function render(url: string) {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await router.navigateByUrl(url);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const settle = async () => {
      await fixture.whenStable();
      fixture.detectChanges();
    };
    const dispatch = (element: Element, type: string) =>
      element.dispatchEvent(new root.ownerDocument.defaultView!.Event(type, { bubbles: true }));
    return { fixture, router, root, settle, dispatch };
  }

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  const statValue = (root: HTMLElement, index: number) =>
    root.querySelector(`.stat-card:nth-child(${index}) .stat-value`)?.textContent?.trim();

  it('should render the dashboard from live data', async () => {
    const { root } = await render('/');
    expect(root.querySelector('h1')?.textContent).toContain('Simeng & Chanthy');
    expect(TestBed.inject(Title).getTitle()).toBe('Dashboard · Vows');
    expect(statValue(root, 1)).toBe('17');
    expect(statValue(root, 2)).toBe('10');
    expect(statValue(root, 3)).toBe('5');
    expect(statValue(root, 4)).toBe('2');
    expect(root.querySelector('#budget .budget-total')?.textContent).toContain('$18,400');
    expect(root.querySelector('.reply-row strong')?.textContent).toContain('Emma & James');
  });

  it('should tick off a task', async () => {
    const { root, settle, dispatch } = await render('/');
    const checkbox = root.querySelector('#tasks input[type="checkbox"]') as HTMLInputElement;

    checkbox.checked = true;
    dispatch(checkbox, 'change');
    await settle();

    expect(root.querySelector('#tasks .task-row')?.classList).toContain('done');
  });

  it('should check in a confirmed party', async () => {
    const { root, settle } = await render('/check-in');
    const checkInButton = root.querySelector('.checkin-button') as HTMLButtonElement;

    checkInButton.click();
    await settle();

    expect(checkInButton.textContent).toContain('Arrived');
    expect(statValue(root, 1)).toContain('4');
  });

  it('should add a new guest party', async () => {
    const { root, settle, dispatch } = await render('/');

    (root.querySelector('.page-actions .button-primary') as HTMLButtonElement).click();
    await settle();

    const nameInput = root.querySelector('#guest-name') as HTMLInputElement;
    nameInput.value = 'Alex Morgan';
    dispatch(nameInput, 'input');
    await settle();
    const submitButton = root.querySelector('.modal-actions .button-primary') as HTMLButtonElement;
    expect(submitButton.disabled).toBe(false);
    submitButton.click();
    await settle();

    expect(root.querySelector('#guest-name')).toBeNull();
    expect(statValue(root, 1)).toBe('18');
    expect(TestBed.inject(WeddingDataService).guests()[0].name).toBe('Alex Morgan');
  });

  it('should add an event to the run of show', async () => {
    const { root, router, settle, dispatch } = await render('/');
    (root.querySelector('.main-nav a[href="/schedule"]') as HTMLAnchorElement).click();
    await settle();
    expect(router.url).toBe('/schedule');
    expect(TestBed.inject(Title).getTitle()).toBe('Event schedule · Vows');

    (root.querySelector('.page-heading .button-primary') as HTMLButtonElement).click();
    await settle();

    const fill = (selector: string, value: string) => {
      const input = root.querySelector(selector) as HTMLInputElement;
      input.value = value;
      dispatch(input, 'input');
    };
    fill('#event-title', 'Garden photos');
    fill('#event-location', 'Rosewood Garden');
    fill('#event-owner', 'Dara Sok');
    fill('#event-date', '2026-10-25');
    await settle();

    (root.querySelector('.modal-actions .button-primary') as HTMLButtonElement).click();
    await settle();
    expect(root.textContent).toContain('Garden photos');
    expect(root.querySelectorAll('.timeline-day')).toHaveLength(2);
    expect(root.textContent).toContain('Sunday, October 25, 2026');
  });

  it('should edit and then delete a schedule event', async () => {
    const { root, settle, dispatch } = await render('/schedule');
    const wedding = TestBed.inject(WeddingDataService);

    (root.querySelector('[aria-label="Edit Lunch reception"]') as HTMLButtonElement).click();
    await settle();
    const title = root.querySelector('#event-title') as HTMLInputElement;
    expect(title.value).toBe('Lunch reception');
    expect(root.querySelector('#schedule-modal-title')?.textContent).toContain('Edit event');

    title.value = 'Garden lunch';
    dispatch(title, 'input');
    const start = root.querySelector('#event-start') as HTMLInputElement;
    start.value = '13:00';
    dispatch(start, 'input');
    await settle();
    (root.querySelector('.modal-actions .button-primary') as HTMLButtonElement).click();
    await settle();

    expect(wedding.schedule().find((item) => item.id === 3)).toEqual(
      expect.objectContaining({ title: 'Garden lunch', time: '13:00', endTime: '14:30' }),
    );
    expect(wedding.schedule()).toHaveLength(4);

    (root.querySelector('[aria-label="Edit Garden lunch"]') as HTMLButtonElement).click();
    await settle();
    const deleteButton = root.querySelector('.button-danger') as HTMLButtonElement;
    deleteButton.click();
    await settle();
    expect(deleteButton.textContent).toContain('Confirm delete');
    expect(wedding.schedule()).toHaveLength(4);
    deleteButton.click();
    await settle();

    expect(wedding.schedule().map((item) => item.title)).not.toContain('Garden lunch');
    expect(root.querySelector('#event-title')).toBeNull();
  });

  it('should import guest details from CSV', async () => {
    const { root, settle, dispatch } = await render('/guests');

    const csvInput = root.querySelector('.csv-button input') as HTMLInputElement;
    const FileConstructor = root.ownerDocument.defaultView!.File;
    const csvFile = new FileConstructor(
      [
        'name,group,side,relationship,email,phone,partySize,plusOnes,children,tags\n"Jamie Lee","Family","Bride","Cousin","jamie@example.com","+85512345678",2,1,0,"VIP;Transport"',
      ],
      'guests.csv',
      { type: 'text/csv' },
    );
    Object.defineProperty(csvInput, 'files', { configurable: true, value: [csvFile] });
    dispatch(csvInput, 'change');
    await settle();

    expect(root.querySelector('.csv-message')?.textContent).toContain('Imported 1 party');
    expect(root.textContent).toContain('Jamie Lee');
    expect(root.textContent).toContain('VIP');
  });

  it('should open a private invitation and update the live RSVP', async () => {
    const { root, router, settle, dispatch } = await render('/invite/a7d4e2c9f0614b83');
    const wedding = TestBed.inject(WeddingDataService);

    expect(root.querySelector('.sidebar')).toBeNull();
    expect(root.textContent).toContain('Emma & James');
    expect(root.querySelector('.invitation-gallery img')?.getAttribute('alt')).toContain('Photo 1');
    expect(root.querySelector('.hero-names')?.textContent).toContain('Simeng');
    expect(root.querySelector('.opening-guest')?.textContent).toContain('Emma & James');
    expect(root.querySelectorAll('.countdown-tile').length).toBe(4);
    expect(root.textContent).toContain('Wedding programme');
    expect(root.textContent).toContain('Welcome & family blessing');
    expect(root.textContent).toContain('Herb-roasted chicken');
    // The default KHQR files have not been added yet: once both fail to load, the section hides.
    const probes = [...root.querySelectorAll('img.visually-hidden[src^="/gifts/"]')];
    expect(probes.map((probe) => probe.getAttribute('src'))).toEqual([
      '/gifts/khqr-riel.png',
      '/gifts/khqr-dollar.png',
    ]);
    probes.forEach((probe) => probe.dispatchEvent(new Event('error')));
    await settle();
    expect(root.querySelector('.gift-card')).toBeNull();
    const attendeeSelect = root.querySelector('#attendees') as HTMLSelectElement;
    attendeeSelect.value = '1';
    dispatch(attendeeSelect, 'change');
    const mealSelect = root.querySelector('#meal') as HTMLSelectElement;
    mealSelect.value = 'Vegan';
    dispatch(mealSelect, 'change');
    await settle();
    (root.querySelector('.invitation-submit') as HTMLButtonElement).click();
    await settle();

    expect(root.textContent).toContain('Your response has been recorded');
    expect(wedding.findGuestByToken('a7d4e2c9f0614b83')?.mealChoice).toBe('Vegan');

    await router.navigateByUrl('/');
    await settle();
    expect(statValue(root, 2)).toBe('9');

    await router.navigateByUrl('/invitations');
    await settle();
    expect(root.querySelector('.photo-manager-item img')?.getAttribute('src')).toBe(
      '/images/gallery/photo-1.jpg',
    );
  });

  it('should add, pay off and filter budget items', async () => {
    const { root, router, settle, dispatch } = await render('/');
    (root.querySelector('.main-nav a[href="/budget"]') as HTMLAnchorElement).click();
    await settle();
    expect(router.url).toBe('/budget');
    expect(TestBed.inject(Title).getTitle()).toBe('Budget · Vows');
    expect(statValue(root, 2)).toBe('$23,500');
    expect(statValue(root, 3)).toBe('$18,400');
    expect(root.querySelector('.upcoming-row strong')?.textContent).toContain(
      'Floral arrangements',
    );

    (root.querySelector('.page-heading .button-primary') as HTMLButtonElement).click();
    await settle();
    const fill = (selector: string, value: string) => {
      const input = root.querySelector(selector) as HTMLInputElement;
      input.value = value;
      dispatch(input, 'input');
    };
    fill('#expense-name', 'Live band');
    const vendor = root.querySelector('#expense-vendor') as HTMLSelectElement;
    vendor.value = '5';
    dispatch(vendor, 'change');
    const category = root.querySelector('#expense-category') as HTMLSelectElement;
    category.value = 'Music & entertainment';
    dispatch(category, 'change');
    fill('#expense-estimated', '1200');
    fill('#expense-paid', '300');
    await settle();
    (root.querySelector('.modal-actions .button-primary') as HTMLButtonElement).click();
    await settle();

    expect(root.querySelector('#expense-name')).toBeNull();
    expect(statValue(root, 2)).toBe('$24,700');
    expect(root.textContent).toContain('Live band');

    (root.querySelector('[aria-label="Edit Live band"]') as HTMLButtonElement).click();
    await settle();
    (root.querySelector('.expense-paid-link') as HTMLButtonElement).click();
    await settle();
    (root.querySelector('.modal-actions .button-primary') as HTMLButtonElement).click();
    await settle();
    expect(statValue(root, 3)).toBe('$19,600');

    const unpaidTab = [...root.querySelectorAll('.filter-tabs button')].find(
      (button) => button.textContent?.trim() === 'Unpaid',
    ) as HTMLButtonElement;
    unpaidTab.click();
    await settle();
    const rows = [...root.querySelectorAll('.expense-table tbody strong')].map((cell) =>
      cell.textContent?.trim(),
    );
    expect(rows).toEqual(['Hair & makeup']);

    await router.navigateByUrl('/');
    await settle();
    expect(root.querySelector('#budget .budget-total')?.textContent).toContain('$19,600');
  });

  it('should add, complete and filter checklist tasks', async () => {
    const { root, router, settle, dispatch } = await render('/');
    (root.querySelector('.main-nav a[href="/tasks"]') as HTMLAnchorElement).click();
    await settle();
    expect(router.url).toBe('/tasks');
    expect(TestBed.inject(Title).getTitle()).toBe('Planning checklist · Vows');
    expect(root.querySelector('.task-phase-heading h3')?.textContent).toContain('12+ months');

    (root.querySelector('.page-heading .button-primary') as HTMLButtonElement).click();
    await settle();
    const title = root.querySelector('#task-title') as HTMLInputElement;
    title.value = 'Book the wedding car';
    dispatch(title, 'input');
    const owner = root.querySelector('#task-owner') as HTMLInputElement;
    owner.value = 'Uncle Vuthy';
    dispatch(owner, 'input');
    const weekBefore = [...root.querySelectorAll('.preset-chip')].find(
      (chip) => chip.textContent?.trim() === '1 week before',
    ) as HTMLButtonElement;
    weekBefore.click();
    await settle();
    expect(root.querySelector('.task-phase-hint')?.textContent).toContain('Final month');
    (root.querySelector('.modal-actions .button-primary') as HTMLButtonElement).click();
    await settle();

    const wedding = TestBed.inject(WeddingDataService);
    const added = wedding.tasks().find((task) => task.title === 'Book the wedding car');
    expect(added).toMatchObject({ owner: 'Uncle Vuthy', dueDate: '2028-01-01', done: false });

    const uncle = [...root.querySelectorAll('.workload-row')].find((row) =>
      row.textContent?.includes('Uncle Vuthy'),
    ) as HTMLButtonElement;
    uncle.click();
    await settle();
    const rows = root.querySelectorAll('.checklist-row');
    expect(rows.length).toBe(1);

    const checkbox = rows[0].querySelector('input[type="checkbox"]') as HTMLInputElement;
    checkbox.checked = true;
    dispatch(checkbox, 'change');
    await settle();
    expect(wedding.tasks().find((task) => task.id === added!.id)?.done).toBe(true);
    expect(root.querySelector('.checklist-row')?.classList).toContain('done');
  });

  it('should show the invitation card in Khmer with gift QR tabs', async () => {
    const wedding = TestBed.inject(WeddingDataService);
    wedding.updateInvitation({
      giftQrKhr: '/khr-qr.png',
      giftQrUsd: '/usd-qr.png',
      lunarDate: 'ថ្ងៃសៅរ៍ ១២កើត',
    });
    TestBed.inject(LocaleService).language.set('km');
    const { root, settle } = await render('/invite/a7d4e2c9f0614b83');

    expect(root.querySelector('.hero-title')?.textContent).toContain('សិរីមង្គលអាពាហ៍ពិពាហ៍');
    expect(root.querySelector('.hero-names')?.textContent).toContain('ចាន់ធី');
    expect(root.querySelector('.hero-date')?.textContent).toContain(
      'ថ្ងៃសៅរ៍ ទី០៨ ខែមករា ឆ្នាំ២០២៨',
    );
    expect(root.querySelector('.event-details')?.textContent).toContain('ថ្ងៃសៅរ៍ ១២កើត');
    expect(root.querySelector('.gift-qr img')?.getAttribute('src')).toBe('/khr-qr.png');

    const dollarTab = [...root.querySelectorAll('.gift-tabs button')].find((tab) =>
      tab.textContent?.includes('ប្រាក់ដុល្លារ'),
    ) as HTMLButtonElement;
    dollarTab.click();
    await settle();
    expect(root.querySelector('.gift-qr img')?.getAttribute('src')).toBe('/usd-qr.png');
  });

  it('should skip album photos whose files have not been added', async () => {
    const wedding = TestBed.inject(WeddingDataService);
    const { root, settle } = await render('/invite/a7d4e2c9f0614b83');
    // The test DOM never loads images, so report two album files as missing by hand.
    wedding.markPhotoMissing('/images/gallery/photo-5.jpg');
    wedding.markPhotoMissing('/images/gallery/photo-6.jpg');
    await settle();
    expect(root.querySelectorAll('.invitation-gallery figure').length).toBe(4);
  });

  it('should fall back to the first pre-wedding photo when the cover file is missing', async () => {
    const { root, settle } = await render('/invite/a7d4e2c9f0614b83');
    expect(root.querySelector('.opening .hero-photo')?.getAttribute('src')).toBe(
      '/images/cover.jpg',
    );

    root
      .querySelector('img.visually-hidden[src="/images/cover.jpg"]')!
      .dispatchEvent(new Event('error'));
    await settle();
    expect(root.querySelector('.opening .hero-photo')?.getAttribute('src')).toBe(
      '/images/gallery/photo-1.jpg',
    );
  });

  it('should hide only the gift tab whose QR image is missing', async () => {
    const { root, settle } = await render('/invite/a7d4e2c9f0614b83');
    root
      .querySelector('img.visually-hidden[src="/gifts/khqr-riel.png"]')!
      .dispatchEvent(new Event('error'));
    await settle();

    const tabs = [...root.querySelectorAll('.gift-tabs button')].map((tab) =>
      tab.textContent?.trim(),
    );
    expect(tabs).toEqual(['$ Dollar']);
    expect(root.querySelector('.gift-qr-frame img')?.getAttribute('src')).toBe(
      '/gifts/khqr-dollar.png',
    );
  });

  it('should start the music when the guest opens the invitation', async () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    const { root, settle } = await render('/invite/a7d4e2c9f0614b83');
    expect(root.querySelector('.opening-guest')?.textContent).toContain('Emma & James');
    expect(root.querySelector('audio')?.getAttribute('src')).toBe('/music/wedding-song.mp3');

    (root.querySelector('.opening-button') as HTMLButtonElement).click();
    await settle();

    expect(play).toHaveBeenCalled();
    expect(root.querySelector('.opening')).toBeNull();
    expect(root.querySelector('.music-button')?.classList).toContain('playing');
    play.mockRestore();
  });

  it('should hide the music button when the song file is missing', async () => {
    const { root, settle } = await render('/invite/a7d4e2c9f0614b83');
    root.querySelector('audio')!.dispatchEvent(new Event('error'));
    (root.querySelector('.opening-button') as HTMLButtonElement).click();
    await settle();
    expect(root.querySelector('.music-button')).toBeNull();
  });

  it('should browse invitation photos in the full-screen viewer', async () => {
    TestBed.inject(WeddingDataService).photos.set([
      { id: 1, name: 'First', url: '/first.jpg' },
      { id: 2, name: 'Second', url: '/second.jpg' },
      { id: 3, name: 'Third', url: '/third.jpg' },
    ]);
    const { root, settle } = await render('/invite/a7d4e2c9f0614b83');
    (root.querySelectorAll('.gallery-open')[1] as HTMLButtonElement).click();
    await settle();
    expect(root.querySelector('.lightbox-count')?.textContent?.trim()).toBe('2 / 3');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    await settle();
    expect(root.querySelector('.lightbox-stage img')?.getAttribute('src')).toBe('/third.jpg');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await settle();
    expect(root.querySelector('.lightbox')).toBeNull();
  });

  it('should save the invitation design from the invitations page', async () => {
    const { root, settle, dispatch } = await render('/invitations');
    const editButton = [...root.querySelectorAll('.design-summary-actions .button')].find(
      (button) => button.textContent?.includes('Edit invitation design'),
    ) as HTMLButtonElement;
    editButton.click();
    await settle();

    const nameOne = root.querySelector('#design-name-one') as HTMLInputElement;
    nameOne.value = 'ផា ចាន់ធី';
    dispatch(nameOne, 'input');
    const time = root.querySelector('#design-time') as HTMLInputElement;
    time.value = '12:00';
    dispatch(time, 'input');
    await settle();
    (
      root.querySelector('.design-panel .modal-actions .button-primary') as HTMLButtonElement
    ).click();
    await settle();

    const settings = TestBed.inject(WeddingDataService).invitation();
    expect(settings.nameOne).toBe('ផា ចាន់ធី');
    expect(settings.ceremonyTime).toBe('12:00');
    expect(root.querySelector('.design-summary-cover')?.textContent).toContain('ផា ចាន់ធី');
  });

  it('should buy a template and show it on the guest invitation', async () => {
    const { root, router, settle } = await render('/templates');
    const card = (name: string) =>
      [...root.querySelectorAll('.template-card')].find((entry) =>
        entry.querySelector('h2')?.textContent?.includes(name),
      )!;
    expect(card('Split photo & paper').classList).toContain('is-active');
    expect(card('Royal night gold').querySelector('.template-price')?.textContent).toContain(
      '$25.49',
    );

    const button = (label: string) =>
      [...root.querySelectorAll('.modal-actions button')].find(
        (entry) => entry.textContent?.trim() === label,
      ) as HTMLButtonElement;

    (card('Royal night gold').querySelector('.button-buy') as HTMLButtonElement).click();
    await settle();
    await settle();
    // The server sets the amount and returns a QR for this order.
    expect(root.querySelector('#checkout-title')?.textContent).toContain('Royal night gold');
    expect(root.querySelector('.checkout-summary strong')?.textContent).toContain('$25.49');
    expect(root.querySelector('.checkout-summary code')?.textContent).toMatch(/^VW-\d{8}$/);
    expect(root.querySelector('.checkout-test')?.textContent).toContain('Test mode');
    expect(TestBed.inject(FakeApi).owned.has('royal')).toBe(false);

    button('Simulate payment').click();
    await settle();
    await settle();
    expect(root.querySelector('.checkout-panel')).toBeNull();
    expect(card('Royal night gold').classList).toContain('is-active');
    expect(TestBed.inject(FakeApi).activeTemplateId).toBe('royal');

    await router.navigateByUrl('/invite/a7d4e2c9f0614b83');
    await settle();
    expect(root.querySelector('main.invite')?.getAttribute('data-template')).toBe('royal');
    expect(root.querySelector('.preview-ribbon')).toBeNull();
  });

  it('should show guests the template their couple chose on the server', async () => {
    TestBed.inject(FakeApi).activeTemplateId = 'floral';
    const { root } = await render('/invite/a7d4e2c9f0614b83');
    expect(root.querySelector('main.invite')?.getAttribute('data-template')).toBe('floral');
    expect(root.querySelector('.preview-ribbon')).toBeNull();
  });

  it('should offer a new QR once an unpaid order expires', async () => {
    const { root, settle } = await render('/templates');
    const button = (label: string) =>
      [...root.querySelectorAll('.modal-actions button')].find(
        (entry) => entry.textContent?.trim() === label,
      ) as HTMLButtonElement;
    (root.querySelector('.template-card .button-buy') as HTMLButtonElement).click();
    await settle();
    await settle();
    const firstReference = root.querySelector('.checkout-summary code')?.textContent;

    TestBed.inject(FakeApi).orders.get(1)!.status = 'expired';
    button('Check payment now').click();
    await settle();
    await settle();
    expect(root.querySelector('.checkout-panel')?.textContent).toContain('has expired');

    button('Get a new QR').click();
    await settle();
    await settle();
    expect(root.querySelector('.checkout-summary code')?.textContent).not.toBe(firstReference);
  });

  it('should mark a store preview of a template guests do not see', async () => {
    const { root } = await render('/invite/a7d4e2c9f0614b83?template=floral');
    expect(root.querySelector('main.invite')?.getAttribute('data-template')).toBe('floral');
    expect(root.querySelector('.preview-ribbon')?.textContent).toContain('Preview');
  });

  it('should record a riel envelope and track the thank-you', async () => {
    const { root, router, settle, dispatch } = await render('/');
    (root.querySelector('.main-nav a[href="/gifts"]') as HTMLAnchorElement).click();
    await settle();
    expect(router.url).toBe('/gifts');
    expect(statValue(root, 2)).toBe('400,000 ៛');

    (root.querySelector('.page-heading .button-primary') as HTMLButtonElement).click();
    await settle();
    const guest = root.querySelector('#gift-guest') as HTMLSelectElement;
    guest.value = '7';
    dispatch(guest, 'change');
    await settle();
    const currency = root.querySelector('#gift-currency') as HTMLSelectElement;
    currency.value = 'KHR';
    dispatch(currency, 'change');
    const amount = root.querySelector('#gift-amount') as HTMLInputElement;
    amount.value = '200000';
    dispatch(amount, 'input');
    await settle();
    (root.querySelector('.modal-actions .button-primary') as HTMLButtonElement).click();
    await settle();

    expect(statValue(root, 2)).toBe('600,000 ៛');
    expect(root.querySelector('.gift-table tbody strong')?.textContent).toContain('Harper & Lucas');
    const unthanked = Number(statValue(root, 4));
    (root.querySelector('.gift-table tbody .thanks-toggle') as HTMLButtonElement).click();
    await settle();
    expect(Number(statValue(root, 4))).toBe(unthanked - 1);
  });

  it('should seat parties and warn when a table is over capacity', async () => {
    const { root, settle, dispatch } = await render('/seating');
    const wedding = TestBed.inject(WeddingDataService);
    const move = (name: string, tableId: string) => {
      // Matched by hand: the test DOM mis-parses "&" inside attribute selectors.
      const select = [...root.querySelectorAll('.party-move')].find(
        (element) => element.getAttribute('aria-label') === `Move ${name} to a table`,
      ) as HTMLSelectElement;
      select.value = tableId;
      dispatch(select, 'change');
    };

    move('David & Lina', '2');
    await settle();
    expect(wedding.guests().find((guest) => guest.name === 'David & Lina')?.tableId).toBe(2);
    expect(root.querySelector('.seating-warnings')?.textContent).toContain(
      'Friends table has David & Lina still waiting to RSVP.',
    );

    move('The Miller Family', '2');
    await settle();
    expect(root.querySelector('.seating-warnings')?.textContent).toContain(
      'Friends table is over capacity: 9 guests for 6 seats.',
    );
    expect(root.querySelector('.table-card.over h2')?.textContent).toContain('Friends table');

    const lookup = root.querySelector('[aria-label="Look up a guest"]') as HTMLInputElement;
    lookup.value = 'emma';
    dispatch(lookup, 'input');
    await settle();
    expect(root.querySelector('.lookup-results')?.textContent).toContain('Family table');
  });

  it('should show vendor contracts, payments and timeline links', async () => {
    const { root, settle, dispatch } = await render('/vendors');
    const lens = [...root.querySelectorAll('.vendor-card')].find((card) =>
      card.textContent?.includes('Lens & Light Studio'),
    )!;
    expect(lens.textContent).toContain('Paid $2,600 / $3,000');
    expect(lens.textContent).toContain('Welcome & family blessing');

    (root.querySelector('.page-heading .button-primary') as HTMLButtonElement).click();
    await settle();
    const fill = (selector: string, value: string) => {
      const input = root.querySelector(selector) as HTMLInputElement;
      input.value = value;
      dispatch(input, 'input');
    };
    fill('#vendor-name', 'Mekong Strings');
    fill('#vendor-service', 'Live band');
    await settle();
    (root.querySelector('.modal-actions .button-primary') as HTMLButtonElement).click();
    await settle();
    expect(root.textContent).toContain('Mekong Strings');
    expect(root.textContent).toContain('No budget items linked yet.');
  });

  it('should show amounts in riel and the menu in Khmer', async () => {
    const { root, settle } = await render('/budget');
    const segmented = (label: string) =>
      [...root.querySelectorAll('.segmented button')].find(
        (button) => button.textContent?.trim() === label,
      ) as HTMLButtonElement;

    segmented('៛').click();
    await settle();
    expect(statValue(root, 3)).toBe('75,440,000 ៛');

    segmented('ខ្មែរ').click();
    await settle();
    expect(root.querySelector('.main-nav a[href="/budget"]')?.textContent).toContain('ថវិកា');
    expect(root.querySelector('h1')?.textContent).toContain('ថវិកាមង្គលការ');
    expect(TestBed.inject(LocaleService).language()).toBe('km');
    expect(document.documentElement.lang).toBe('km');
  });

  describe('guest photo sharing', () => {
    const SHARE_PATH = '/share/sd2026-k7q4m9';

    beforeEach(() => {
      // The test DOM has no object URLs; any stable string works as an image source here.
      vi.spyOn(URL, 'createObjectURL').mockImplementation(() => 'blob:test-photo');
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    const choosePhotos = (
      root: HTMLElement,
      files: File[],
      dispatch: (element: Element, type: string) => boolean,
    ) => {
      const input = root.querySelector('.share-upload-button input') as HTMLInputElement;
      Object.defineProperty(input, 'files', { configurable: true, value: files });
      dispatch(input, 'change');
    };

    it('should let a guest add photos from the QR link', async () => {
      TestBed.inject(AuthService).logout();
      const { root, settle, dispatch } = await render(SHARE_PATH);
      expect(root.querySelector('.share-hero h1')?.textContent).toContain('Simeng & Chanthy');

      const name = root.querySelector('#share-name') as HTMLInputElement;
      name.value = 'Cousin Vanna';
      dispatch(name, 'input');
      choosePhotos(
        root,
        [
          new File(['a'], 'dance.jpg', { type: 'image/jpeg' }),
          new File(['b'], 'notes.pdf', { type: 'application/pdf' }),
        ],
        dispatch,
      );
      await settle();

      expect(root.querySelector('.share-success')?.textContent).toContain(
        'Your photo is in the gallery',
      );
      expect(root.querySelector('.share-error')?.textContent).toContain('notes.pdf');
      expect(root.querySelector('.share-grid figcaption')?.textContent).toContain('Cousin Vanna');
      expect(TestBed.inject(WeddingDataService).sharedPhotos().length).toBe(2);
    });

    it('should reject an unknown gallery link', async () => {
      const { root } = await render('/share/not-the-code');
      expect(root.querySelector('.share-invalid h1')?.textContent).toContain(
        'This link is not valid',
      );
      expect(root.querySelector('.share-upload-button')).toBeNull();
    });

    it('should let the couple hide photos and close uploads', async () => {
      const { root, router, settle } = await render('/');
      (root.querySelector('.main-nav a[href="/gallery"]') as HTMLAnchorElement).click();
      await settle();
      expect(router.url).toBe('/gallery');
      expect(root.querySelector('.share-url')?.textContent).toContain(SHARE_PATH);

      const hide = [...root.querySelectorAll('.photo-actions .button')].find(
        (button) => button.textContent?.trim() === 'Hide',
      ) as HTMLButtonElement;
      hide.click();
      await settle();
      expect(root.querySelector('.photo-tile')?.classList).toContain('is-hidden');
      expect(TestBed.inject(WeddingDataService).visibleSharedPhotos()).toEqual([]);

      (root.querySelector('.switch') as HTMLButtonElement).click();
      await settle();
      await router.navigateByUrl(SHARE_PATH);
      await settle();
      expect(root.querySelector('.share-card h2')?.textContent).toContain('Uploads are closed');
      expect(root.querySelector('.share-empty')?.textContent).toContain('Be the first');
    });
  });

  describe('roles', () => {
    const signInAs = async (email: string, password: string) => {
      const auth = TestBed.inject(AuthService);
      auth.logout();
      await auth.login(email, password);
    };
    const navLabels = (root: HTMLElement) =>
      [...root.querySelectorAll('.main-nav .nav-link')].map((link) =>
        link.textContent?.replace(/\d+/g, '').trim(),
      );

    it('should limit check-in staff to the check-in page', async () => {
      await signInAs('staff@vows.local', 'vows-staff');
      const { root, router, settle } = await render('/gifts');
      expect(router.url).toBe('/check-in');
      expect(navLabels(root)).toEqual(['Check-in']);

      await router.navigateByUrl('/budget');
      await settle();
      expect(router.url).toBe('/check-in');
    });

    it('should give family helpers the gift book but not the budget', async () => {
      await signInAs('helper@vows.local', 'vows-helper');
      const { root, router } = await render('/');
      expect(router.url).toBe('/gifts');
      expect(navLabels(root)).toEqual(['Gifts', 'Tasks']);
    });

    it('should keep gifts private from planners', async () => {
      await signInAs('planner@vows.local', 'vows-planner');
      const { root, router } = await render('/gifts');
      expect(router.url).toBe('/');
      expect(navLabels(root)).not.toContain('Gifts');
      expect(navLabels(root)).toContain('Vendors');
      expect(navLabels(root)).toContain('Templates');
    });
  });

  describe('admin login', () => {
    beforeEach(() => {
      TestBed.inject(AuthService).logout();
    });

    const fillLogin = (
      root: HTMLElement,
      email: string,
      password: string,
      dispatch: (element: Element, type: string) => boolean,
    ) => {
      const emailInput = root.querySelector('#login-email') as HTMLInputElement;
      const passwordInput = root.querySelector('#login-password') as HTMLInputElement;
      emailInput.value = email;
      dispatch(emailInput, 'input');
      passwordInput.value = password;
      dispatch(passwordInput, 'input');
    };

    it('should send signed-out visitors to the login page', async () => {
      const { root, router } = await render('/guests');

      expect(router.url).toBe('/login?returnUrl=%2Fguests');
      expect(root.querySelector('.sidebar')).toBeNull();
      expect(root.querySelector('h1')?.textContent).toContain('Welcome back');
    });

    it('should reject a wrong password', async () => {
      const { root, router, settle, dispatch } = await render('/');
      fillLogin(root, 'admin@vows.local', 'wrong', dispatch);
      (root.querySelector('.login-submit') as HTMLButtonElement).click();
      await settle();

      expect(root.querySelector('.form-error')?.textContent).toContain('do not match');
      expect(router.url).toContain('/login');
    });

    it('should sign in, return to the requested page, and sign out', async () => {
      const { root, router, settle, dispatch } = await render('/guests');
      fillLogin(root, 'Admin@Vows.local', 'vows-admin', dispatch);
      (root.querySelector('.login-submit') as HTMLButtonElement).click();
      await settle();

      expect(router.url).toBe('/guests');
      expect(root.querySelector('.sidebar-account')?.textContent).toContain('admin@vows.local');

      (root.querySelector('.sidebar-signout') as HTMLButtonElement).click();
      await settle();

      expect(router.url).toBe('/login');
      expect(TestBed.inject(AuthService).isAuthenticated()).toBe(false);
    });

    it('should restore the session the server remembers after a page reload', async () => {
      TestBed.inject(FakeApi).session = {
        email: 'planner@vows.local',
        name: 'Malis Chan',
        role: 'planner',
        wedding: { id: 1, name: 'Simeng & Chanthy' },
      };
      // A new AuthService is what a reloaded page starts with: no session until it asks.
      const reloaded = TestBed.runInInjectionContext(() => new AuthService());
      expect(reloaded.isAuthenticated()).toBe(false);

      await reloaded.ensureLoaded();
      expect(reloaded.session()?.email).toBe('planner@vows.local');
    });

    it('should keep guest invitations public', async () => {
      const { root, router } = await render('/invite/a7d4e2c9f0614b83');

      expect(router.url).toBe('/invite/a7d4e2c9f0614b83');
      expect(root.textContent).toContain('Emma & James');
    });
  });
});
