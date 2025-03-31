import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { WorkflowService } from './workflow/services/workflow.service';
import { WorkflowData } from './workflow/models/workflow.model';
import { WorkflowContainerComponent } from './workflow/components/workflow-container/workflow-container.component';
import { BpmnViewerComponent } from './components/BpmnDiagram/app-svg-connector.component';
import { BpmnViewerCustomComponent } from './diagrambpmn/components/bpmn-viewer.component';

@Component({
  selector: 'app-root',
  template: `
    <div class="container">
      <h1>Workflow Diagram</h1>

      <div class="view-selector">
        <div class="selector-track">
          <div class="selector-thumb" [style.left]="getThumbPosition()"></div>
          <div
            class="selector-option"
            (click)="setViewMode('workflow')"
            [class.active]="viewMode === 'workflow'"
          >
            Workflow Diagram
          </div>
          <div
            class="selector-option"
            (click)="setViewMode('bpmn')"
            [class.active]="viewMode === 'bpmn'"
          >
            BPMN Viewer
          </div>
          <div
            class="selector-option"
            (click)="setViewMode('custom-bpmn')"
            [class.active]="viewMode === 'custom-bpmn'"
          >
            Custom BPMN Viewer
          </div>
        </div>
      </div>

      <div class="tag-checks" *ngIf="viewMode === 'workflow'">
        <label>
          <input type="checkbox" [(ngModel)]="showIncidents" />
          <span class="checkmark"></span>
          Show Incidents
        </label>
        <label>
          <input type="checkbox" [(ngModel)]="showTime" />
          <span class="checkmark"></span>
          Show Time
        </label>
        <label>
          <input type="checkbox" [(ngModel)]="showInstances" />
          <span class="checkmark"></span>
          Show Instances
        </label>
      </div>

      <ng-container *ngIf="viewMode === 'workflow'">
        <div class="workflow-select">
          <label for="workflow-type">Seleccionar flujo de trabajo:</label>
          <select
            id="workflow-type"
            [(ngModel)]="selectedWorkflowType"
            (change)="changeWorkflow()"
          >
            <option value="simple">Simple</option>
            <option value="heatmap">Heatmap</option>
            <option value="compact">Compact</option>
          </select>
        </div>
      </ng-container>

      <ng-container *ngIf="viewMode === 'bpmn'">
        <app-bpmn-viewer></app-bpmn-viewer>
      </ng-container>

      <ng-container *ngIf="viewMode === 'custom-bpmn'">
        <app-bpmn-viewer-custom></app-bpmn-viewer-custom>
      </ng-container>

      <ng-container *ngIf="viewMode === 'workflow' && workflowData">
        <app-workflow-container
          [workflowData]="workflowData"
          [showIncidents]="showIncidents"
          [showTime]="showTime"
          [showInstances]="showInstances"
        ></app-workflow-container>
      </ng-container>

      <ng-container *ngIf="viewMode === 'workflow' && !workflowData">
        <p>Cargando datos...</p>
      </ng-container>
    </div>
  `,
  styles: [
    `
      .container {
        padding: 20px;
        max-width: 1200px;
        margin: 0 auto;
      }
      h1 {
        color: #333;
        margin-bottom: 20px;
      }

      .view-selector {
        margin-bottom: 25px;
      }

      .selector-track {
        position: relative;
        display: flex;
        background-color: #f0f0f0;
        border-radius: 30px;
        height: 50px;
        align-items: center;
        justify-content: space-between;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        overflow: hidden;
      }

      .selector-thumb {
        position: absolute;
        width: calc(100% / 3);
        height: 80%;
        background-color: #2196f3;
        border-radius: 25px;
        transition: left 0.3s ease;
        z-index: 1;
        top: 10%;
      }

      .selector-option {
        flex: 1;
        text-align: center;
        color: #333;
        font-weight: 500;
        cursor: pointer;
        z-index: 2;
        padding: 12px 0;
        transition: color 0.3s ease;
      }

      .selector-option.active {
        color: white;
      }

      /* Estilos para los checkbox personalizados */
      .tag-checks {
        margin-bottom: 20px;
      }
      .tag-checks label {
        position: relative;
        padding-left: 35px;
        margin-right: 20px;
        cursor: pointer;
        font-size: 16px;
        user-select: none;
        display: inline-block;
        line-height: 24px;
      }
      .tag-checks label input {
        position: absolute;
        opacity: 0;
        cursor: pointer;
        height: 0;
        width: 0;
      }
      .tag-checks .checkmark {
        position: absolute;
        top: 0;
        left: 0;
        height: 24px;
        width: 24px;
        background-color: #eee;
        border-radius: 4px;
        transition: background-color 0.2s;
      }
      .tag-checks label:hover input ~ .checkmark {
        background-color: #ccc;
      }
      .tag-checks label input:checked ~ .checkmark {
        background-color: #2196f3;
      }
      .tag-checks .checkmark:after {
        content: '';
        position: absolute;
        display: none;
      }
      .tag-checks label input:checked ~ .checkmark:after {
        display: block;
      }
      .tag-checks label .checkmark:after {
        left: 8px;
        top: 4px;
        width: 5px;
        height: 10px;
        border: solid white;
        border-width: 0 3px 3px 0;
        transform: rotate(45deg);
      }
      /* Estilos para el dropdown */
      .workflow-select {
        margin-bottom: 20px;
      }
      .workflow-select label {
        font-size: 16px;
      }
      .workflow-select select {
        appearance: none;
        -webkit-appearance: none;
        -moz-appearance: none;
        background-color: #fff;
        border: 1px solid #ccc;
        padding: 8px 38px 8px 12px;
        font-size: 16px;
        border-radius: 4px;
        background-image: url("data:image/svg+xml,%3Csvg width='10' height='5' viewBox='0 0 10 5' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0l5 5 5-5z' fill='%23333'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 10px center;
        background-size: 10px 5px;
        transition: border-color 0.2s ease-in-out;
      }
      .workflow-select select:focus {
        outline: none;
        border-color: #2196f3;
      }
    `,
  ],
  imports: [
    WorkflowContainerComponent,
    BpmnViewerComponent,
    FormsModule,
    CommonModule,
    BpmnViewerCustomComponent,
  ],
  standalone: true,
})
export class AppComponent implements OnInit {
  workflowData!: WorkflowData;
  viewMode: 'workflow' | 'bpmn' | 'custom-bpmn' = 'workflow';
  selectedWorkflowType: string = 'heatmap';
  showIncidents = false;
  showTime = false;
  showInstances = false;

  constructor(private readonly workflowService: WorkflowService) {}

  ngOnInit() {
    this.loadWorkflow(this.selectedWorkflowType);
  }

  setViewMode(mode: 'workflow' | 'bpmn' | 'custom-bpmn') {
    this.viewMode = mode;
  }

  getThumbPosition(): string {
    switch (this.viewMode) {
      case 'workflow':
        return '0%';
      case 'bpmn':
        return 'calc(100% / 3)';
      case 'custom-bpmn':
        return 'calc(200% / 3)';
      default:
        return '0%';
    }
  }

  changeWorkflow() {
    this.loadWorkflow(this.selectedWorkflowType);
  }

  loadWorkflow(type: string) {
    switch (type) {
      case 'simple':
        this.workflowService.getSimpleWorkflowData().subscribe((data) => {
          this.workflowData = data;
        });
        break;
      case 'heatmap':
        this.workflowService.getHeatmapWorkflowData().subscribe((data) => {
          this.workflowData = data;
        });
        break;
      case 'compact':
        this.workflowService.getCompactWorkflowData().subscribe((data) => {
          this.workflowData = data;
        });
        break;
    }
  }
}
