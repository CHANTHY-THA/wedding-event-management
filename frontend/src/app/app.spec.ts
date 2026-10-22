import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { WeddingDataService } from './core/wedding-data.service';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)],
    }).compileComponents();
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
    expect(root.querySelector('h1')?.textContent).toContain('Sophea & Dara');
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
    expect(root.querySelector('.invitation-gallery img')?.getAttribute('alt')).toContain(
      'Sample pre-wedding illustration',
    );
    expect(root.textContent).toContain('The day, at a glance');
    expect(root.textContent).toContain('Welcome & family blessing');
    expect(root.textContent).toContain('A taste of the celebration');
    expect(root.textContent).toContain('Herb-roasted chicken');
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
      '/images/pre-wedding-preview.svg',
    );
  });
});
