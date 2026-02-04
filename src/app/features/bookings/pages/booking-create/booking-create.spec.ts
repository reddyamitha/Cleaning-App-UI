import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BookingCreate } from './booking-create';

describe('BookingCreate', () => {
  let component: BookingCreate;
  let fixture: ComponentFixture<BookingCreate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingCreate]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BookingCreate);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
