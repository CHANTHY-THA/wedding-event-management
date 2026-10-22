import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { WeddingDataService } from './wedding-data.service';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the wedding overview and MVP sections', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Good morning, Sophia');
    expect(compiled.querySelector('#guests h2')?.textContent).toContain('Guest list');
    expect(compiled.querySelector('#budget h2')?.textContent).toContain('Wedding budget');
  });

  it('should check in a confirmed party', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const checkInButton = fixture.nativeElement.querySelector(
      '.checkin-button',
    ) as HTMLButtonElement;

    checkInButton.click();
    fixture.detectChanges();

    expect(checkInButton.textContent).toContain('Arrived');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.stat-card:nth-child(3) .stat-value')
        ?.textContent,
    ).toContain('4');
  });

  it('should add a new guest party', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;

    (root.querySelector('.page-heading .button-primary') as HTMLButtonElement).click();
    fixture.detectChanges();

    const nameInput = root.querySelector('#guest-name') as HTMLInputElement;
    nameInput.value = 'Alex Morgan';
    nameInput.dispatchEvent(new root.ownerDocument.defaultView!.Event('input', { bubbles: true }));
    await fixture.whenStable();
    fixture.detectChanges();
    const submitButton = root.querySelector('.modal-actions .button-primary') as HTMLButtonElement;
    expect(submitButton.disabled).toBe(false);
    submitButton.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(root.querySelector('.guest-name-cell strong')?.textContent).toContain('Alex Morgan');
    expect(root.querySelector('#guest-name')).toBeNull();
  });

  it('should add an event to the run of show', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    (root.querySelector('.main-nav button:nth-child(2)') as HTMLButtonElement).click();
    fixture.detectChanges();
    (root.querySelector('.page-heading .button-primary') as HTMLButtonElement).click();
    fixture.detectChanges();

    const title = root.querySelector('#event-title') as HTMLInputElement;
    title.value = 'Garden photos';
    title.dispatchEvent(new root.ownerDocument.defaultView!.Event('input', { bubbles: true }));
    const location = root.querySelector('#event-location') as HTMLInputElement;
    location.value = 'Rosewood Garden';
    location.dispatchEvent(new root.ownerDocument.defaultView!.Event('input', { bubbles: true }));
    const owner = root.querySelector('#event-owner') as HTMLInputElement;
    owner.value = 'Dara Sok';
    owner.dispatchEvent(new root.ownerDocument.defaultView!.Event('input', { bubbles: true }));
    const date = root.querySelector('#event-date') as HTMLInputElement;
    date.value = '2026-10-25';
    date.dispatchEvent(new root.ownerDocument.defaultView!.Event('input', { bubbles: true }));
    fixture.detectChanges();

    (root.querySelector('.modal-actions .button-primary') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(root.textContent).toContain('Garden photos');
    expect(root.querySelectorAll('.timeline-day')).toHaveLength(2);
    expect(root.textContent).toContain('Sunday, October 25, 2026');
  });

  it('should import guest details from CSV', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    (root.querySelector('.main-nav button:nth-child(3)') as HTMLButtonElement).click();
    fixture.detectChanges();

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
    csvInput.dispatchEvent(new root.ownerDocument.defaultView!.Event('change', { bubbles: true }));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(root.querySelector('.csv-message')?.textContent).toContain('Imported 1 party');
    expect(root.textContent).toContain('Jamie Lee');
    expect(root.textContent).toContain('VIP');
  });

  it('should open a private invitation and update the live RSVP', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    const wedding = TestBed.inject(WeddingDataService);
    fixture.detectChanges();
    await router.navigateByUrl('/invite/a7d4e2c9f0614b83');
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[role="dialog"]')).toBeNull();
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
    attendeeSelect.dispatchEvent(
      new root.ownerDocument.defaultView!.Event('change', { bubbles: true }),
    );
    const mealSelect = root.querySelector('#meal') as HTMLSelectElement;
    mealSelect.value = 'Vegan';
    mealSelect.dispatchEvent(
      new root.ownerDocument.defaultView!.Event('change', { bubbles: true }),
    );
    fixture.detectChanges();
    (root.querySelector('.invitation-submit') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(root.textContent).toContain('Your response has been recorded');
    await router.navigateByUrl('/');
    fixture.detectChanges();
    expect(root.querySelector('.main-nav button:nth-child(4)')).not.toBeNull();
    expect(root.querySelector('.stat-card:nth-child(2) .stat-value')?.textContent).toContain('9');
    expect(wedding.findGuestByToken('a7d4e2c9f0614b83')?.mealChoice).toBe('Vegan');
    (root.querySelector('.main-nav button:nth-child(4)') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(root.querySelector('.photo-manager-item img')?.getAttribute('src')).toBe(
      '/images/pre-wedding-preview.svg',
    );
  });
});
