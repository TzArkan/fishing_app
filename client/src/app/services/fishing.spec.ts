import { TestBed } from '@angular/core/testing';

import { FishingService } from './fishing';

describe('Fishing', () => {
  let service: FishingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FishingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
