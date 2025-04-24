import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BpmnViewerCustomComponent } from './diagrambpmn/components/bpmn-viewer.component';

@Component({
  selector: 'app-root',
  template: `
    <div class="container">
      <app-bpmn-viewer-custom></app-bpmn-viewer-custom>
    </div>
  `,
  styles: [
    `
      .container {
        padding: 20px;
        max-width: 1200px;
        margin: 0 auto;
      }
    `,
  ],
  imports: [FormsModule, CommonModule, BpmnViewerCustomComponent],
  standalone: true,
})
export class AppComponent implements OnInit {
  ngOnInit() {
    // Empty initialization
  }
}
