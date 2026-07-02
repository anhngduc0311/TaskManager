import { TestBed } from '@angular/core/testing';
import { TaskDrawerComponent } from './task-drawer.component';
import { TaskService } from '../services/task.service';
import { AuthService } from '../services/auth.service';

describe('TaskDrawerComponent URL linkification', () => {
  let component: any;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TaskDrawerComponent],
      providers: [
        { provide: TaskService, useValue: { apiUrl: 'http://localhost:5205/api/tasks' } },
        { provide: AuthService, useValue: { currentUser: () => 'admin' } }
      ]
    });
    const fixture = TestBed.createComponent(TaskDrawerComponent);
    component = fixture.componentInstance;
  });

  it('should auto-link bare URLs starting with http/https in description text', () => {
    const input = 'Vui lòng truy cập https://google.com và http://example.org/test?foo=bar để biết thêm chi tiết.';
    const output = component.formatDescriptionForDisplay(input);
    expect(output).toContain('<a href="https://google.com" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">https://google.com</a>');
    expect(output).toContain('<a href="http://example.org/test?foo=bar" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">http://example.org/test?foo=bar</a>');
  });

  it('should not wrap URLs that are already within <a> tags', () => {
    const input = 'Xem link này: <a href="https://github.com">https://github.com</a> và link khác: https://gitlab.com';
    const output = component.formatDescriptionForDisplay(input);
    
    // The existing link should remain untouched (not double-wrapped)
    expect(output).toContain('<a href="https://github.com">https://github.com</a>');
    
    // The bare link should be wrapped
    expect(output).toContain('<a href="https://gitlab.com" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">https://gitlab.com</a>');
  });

  it('should not modify image src or other attributes', () => {
    const input = '<img src="https://example.com/logo.png" alt="logo"> và liên kết https://example.com';
    const output = component.formatDescriptionForDisplay(input);
    
    // Image src should remain untouched
    expect(output).toContain('src="https://example.com/logo.png"');
    
    // The bare link should be wrapped
    expect(output).toContain('<a href="https://example.com" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">https://example.com</a>');
  });
});
