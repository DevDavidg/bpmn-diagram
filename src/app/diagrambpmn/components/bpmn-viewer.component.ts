import {
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  inject,
  AfterViewInit,
  OnDestroy,
  NgZone,
  Renderer2,
} from '@angular/core';
import BpmnJS from 'bpmn-js';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface H337 {
  create: (config: any) => any;
}

interface TaskTag {
  taskId: string;
  time?: { value: string; visible?: boolean };
  instances?: { value: number; visible?: boolean };
  incidents?: { value: number; visible?: boolean };
}

@Component({
  selector: 'app-bpmn-viewer-custom',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bpmn-container">
      <h2>Visor BPMN Personalizado</h2>

      <div class="controls">
        <div class="diagram-selector">
          <label for="diagram-select">Seleccionar diagrama: </label>
          <select
            id="diagram-select"
            [(ngModel)]="selectedDiagram"
            (change)="loadDiagram()"
            class="select-control"
          >
            <option *ngFor="let diagram of availableDiagrams" [value]="diagram">
              {{ diagram }}
            </option>
          </select>
        </div>

        <div class="tag-controls">
          <div class="tag-control">
            <input
              type="checkbox"
              id="time-tag"
              [(ngModel)]="showTimeTags"
              (change)="updateTagsVisibility()"
            />
            <label for="time-tag" class="tag-label time-tag"
              ><img
                src="../../../assets/icons/time.svg"
                class="tag-icon"
                alt="Time Icon"
              />
              Tiempo</label
            >
          </div>
          <div class="tag-control">
            <input
              type="checkbox"
              id="instance-tag"
              [(ngModel)]="showInstanceTags"
              (change)="updateTagsVisibility()"
            />
            <label for="instance-tag" class="tag-label instance-tag"
              ><img
                src="../../../assets/icons/instances.svg"
                class="tag-icon"
                alt="Instances Icon"
              />
              Instancias</label
            >
          </div>
          <div class="tag-control">
            <input
              type="checkbox"
              id="incident-tag"
              [(ngModel)]="showIncidentTags"
              (change)="updateTagsVisibility()"
            />
            <label for="incident-tag" class="tag-label incident-tag"
              ><img
                src="../../../assets/icons/incidents.svg"
                class="tag-icon"
                alt="Incidents Icon"
              />
              Incidentes</label
            >
          </div>
          <div class="tag-control">
            <div class="toggle-slider">
              <input
                type="checkbox"
                id="heatmap-toggle"
                [(ngModel)]="showHeatmap"
                (change)="toggleHeatmap()"
                class="toggle-input"
              />
              <label for="heatmap-toggle" class="toggle-label">
                <span class="toggle-icon">{{ showHeatmap ? '✓' : '✗' }}</span>
              </label>
              <span class="toggle-text heatmap-tag"> Display heatmap </span>
            </div>
          </div>
        </div>
      </div>

      <div class="diagram-wrapper">
        <div #bpmnContainer class="diagram-container"></div>
        <div #heatmapContainer class="heatmap-container"></div>
        <div #tooltipContainer class="tooltip-container"></div>
      </div>

      <div *ngIf="error" class="error">{{ error }}</div>
    </div>
  `,
  styles: [
    `
      .bpmn-container {
        display: flex;
        flex-direction: column;
        height: 100%;
        width: 100%;
        font-family: Arial, sans-serif;
      }

      :host ::ng-deep .djs-element:hover .djs-label,
      :host ::ng-deep .djs-element:hover text,
      :host ::ng-deep .djs-element .djs-label,
      :host ::ng-deep .djs-element text,
      .controls {
        margin-bottom: 15px;
        padding: 15px;
        background-color: #f8f9fa;
        border-radius: 8px;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 15px;
        z-index: 10;
      }
      .diagram-wrapper {
        position: relative;
        height: 600px;
        width: 100%;
      }
      .diagram-selector {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .select-control {
        padding: 8px 12px;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 14px;
        background-color: white;
        min-width: 200px;
      }
      .zoom-level {
        margin-left: 10px;
        font-size: 14px;
        color: #666;
        min-width: 45px;
        text-align: center;
        padding: 5px;
        background-color: #f8f9fa;
        border-radius: 4px;
      }
      .tag-controls {
        display: flex;
        gap: 12px;
        align-items: center;
      }
      .tag-control {
        display: flex;
        align-items: center;
        gap: 5px;
      }
      .tag-label {
        display: flex;
        align-items: center;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 13px;
        cursor: pointer;
      }
      .tag-icon {
        margin-right: 4px;
        width: 16px;
        height: 16px;
      }
      .time-tag {
        background-color: #856300;
        color: white;
      }
      .instance-tag {
        background-color: #23779a;
        color: white;
      }
      .incident-tag {
        background-color: #cc0000;
        color: white;
      }
      .heatmap-tag {
        background-color: #127277;
        color: white;
      }
      .toggle-slider {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .toggle-input {
        display: none;
      }
      .toggle-label {
        position: relative;
        display: inline-block;
        width: 48px;
        height: 24px;
        background-color: #ccc;
        border-radius: 12px;
        cursor: pointer;
        transition: background-color 0.3s;
      }
      .toggle-input:checked + .toggle-label {
        background-color: #127277;
      }
      .toggle-icon {
        position: absolute;
        top: 50%;
        left: 12px;
        transform: translateY(-50%);
        color: white;
        font-size: 14px;
        font-weight: bold;
        transition: left 0.3s;
      }
      .toggle-input:checked + .toggle-label .toggle-icon {
        left: 30px;
      }
      .toggle-text {
        display: flex;
        align-items: center;
        font-size: 13px;
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 4px;
      }
      .diagram-container {
        flex-grow: 1;
        border: 1px solid #ddd;
        border-radius: 8px;
        height: 100%;
        width: 100%;
        overflow: hidden;
        position: absolute;
        top: 0;
        left: 0;
        cursor: grab;
        box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.05);
        z-index: 1;
      }
      .heatmap-container {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 2;
        pointer-events: none;
      }
      .tooltip-container {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 9000;
        pointer-events: none;
      }
      .error {
        margin-top: 15px;
        padding: 15px;
        background-color: #ffdddd;
        border-left: 5px solid #f44336;
        color: #333;
        border-radius: 4px;
      }
      :host ::ng-deep .bjs-powered-by {
        display: none !important;
      }
      :host ::ng-deep .bpmn-task-tags {
        position: absolute;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
        z-index: 1000;
        pointer-events: none;
      }
      :host ::ng-deep .bpmn-tag {
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 12px;
        display: flex;
        align-items: center;
        white-space: nowrap;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
      }
      :host ::ng-deep .bpmn-tag-time {
        background-color: #990000;
        color: white;
      }
      :host ::ng-deep .bpmn-tag-instances {
        background-color: #23779a;
        color: white;
      }
      :host ::ng-deep .bpmn-tag-incidents {
        background-color: #cc0000;
        color: white;
      }
      :host ::ng-deep .tag-icon {
        margin-right: 4px;
        width: 16px;
        height: 16px;
      }

      :host ::ng-deep .bpmn-task-tooltip {
        position: absolute;
        z-index: 9999;
        background-color: white;
        border-radius: 12px;
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.25);
        padding: 16px;
        min-width: 280px;
        max-width: 380px;
        animation: tooltip-fade-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        border: none;
        backdrop-filter: blur(5px);
        font-family: typescale/body/medium/strong/font;
        font-weight: 700;
        font-size: typescale/body/medium/strong/size;
        line-height: typescale/body/medium/strong/line-height;
        letter-spacing: 0%;
        text-align: center;
        transform-origin: top center;
        --arrow-position: none;
        --arrow-offset: 50%;
        pointer-events: all;
      }

      :host ::ng-deep .bpmn-task-tooltip::before {
        content: '';
        position: absolute;
        width: 0;
        height: 0;
        border-style: solid;

        border-width: 10px 10px 0 10px;
        border-color: white transparent transparent transparent;
        bottom: -10px;
        left: var(--arrow-offset);
        transform: translateX(-50%);
        display: var(--arrow-position, none);
      }

      :host ::ng-deep .bpmn-task-tooltip[style*='--arrow-position:top']::before,
      :host
        ::ng-deep
        .bpmn-task-tooltip[style*='--arrow-position: top']::before {
        border-width: 0 10px 10px 10px;
        border-color: transparent transparent white transparent;
        top: -10px;
        bottom: auto;
        display: block;
      }

      :host
        ::ng-deep
        .bpmn-task-tooltip[style*='--arrow-position:bottom']::before,
      :host
        ::ng-deep
        .bpmn-task-tooltip[style*='--arrow-position: bottom']::before {
        border-width: 10px 10px 0 10px;
        border-color: white transparent transparent transparent;
        bottom: -10px;
        top: auto;
        display: block;
      }

      @keyframes tooltip-fade-in {
        from {
          opacity: 0;
          transform: translateY(8px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      :host ::ng-deep .tooltip-close-btn {
        position: absolute;
        right: 0px;
        top: 0px;
        background: rgba(0, 0, 0, 0.05);
        border: none;
        font-size: 18px;
        cursor: pointer;
        color: #444;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: all 0.2s ease;
        left: auto;
      }

      :host ::ng-deep .tooltip-close-btn:hover {
        background-color: rgba(0, 0, 0, 0.1);
        color: #000;
        transform: scale(1.1);
      }

      :host ::ng-deep .tooltip-title {
        font-weight: 700;
        margin-bottom: 15px;
        font-size: typescale/body/medium/strong/size;
        padding-right: 30px;
        padding-left: 10px;
        color: #1565c0;
        border-bottom: 2px solid #eef5ff;
        padding-bottom: 10px;
        letter-spacing: 0%;
        text-align: center;
      }

      :host ::ng-deep .tooltip-content {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      :host ::ng-deep .tooltip-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 14px;
        padding: 6px 4px;
        border-radius: 8px;
        background-color: #f8f9fa;
        transition: background-color 0.2s ease;
      }

      :host ::ng-deep .tooltip-info:hover {
        background-color: #f0f2f5;
      }

      :host ::ng-deep .tooltip-label {
        color: #555;
        display: flex;
        align-items: center;
        gap: 6px;
        font-weight: 500;
      }

      :host ::ng-deep .tooltip-value {
        font-weight: 600;
        color: #222;
        background-color: rgba(255, 255, 255, 0.5);
        padding: 2px 4px;
        border-radius: 4px;
        border: 1px solid #eaeaea;
      }

      :host ::ng-deep .tooltip-info:nth-child(even) {
        background-color: #f2f6ff;
      }

      :host ::ng-deep .tooltip-info:nth-child(even):hover {
        background-color: #e8f0ff;
      }
      :host ::ng-deep .djs-element.selected .djs-visual > :not(text) {
        stroke: #1a73e8 !important;
        stroke-width: 2px !important;
      }

      :host ::ng-deep .djs-element:hover .djs-visual > :not(text) {
        stroke: #2196f3 !important;
        stroke-width: 2px !important;
        cursor: pointer !important;
      }
    `,
  ],
})
export class BpmnViewerCustomComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  @ViewChild('bpmnContainer', { static: true }) bpmnContainer!: ElementRef;
  @ViewChild('heatmapContainer', { static: true })
  heatmapContainer!: ElementRef;
  @ViewChild('tooltipContainer', { static: true })
  tooltipContainer!: ElementRef;

  private readonly http = inject(HttpClient);
  private readonly ngZone = inject(NgZone);
  private readonly renderer = inject(Renderer2);

  private bpmnViewer: any;
  private canvas: any;
  private elementRegistry: any;
  private heatmapInstance: any;
  private h337: H337 | null = null;
  private viewBox: any = { x: 0, y: 0, width: 0, height: 0 };
  private resizeObserver: ResizeObserver | null = null;
  private tooltipElement: HTMLElement | null = null;
  private activeTaskId: string | null = null;
  private isCanvasDragging = false;

  availableDiagrams: string[] = [];
  selectedDiagram: string = '';
  error: string | null = null;
  currentZoom: number = 1;
  taskTags: TaskTag[] = [];
  showTimeTags: boolean = true;
  showInstanceTags: boolean = true;
  showIncidentTags: boolean = true;
  showHeatmap: boolean = false;

  private readonly MIN_ZOOM = 0.4;
  private readonly MAX_ZOOM = 2.5;
  private readonly ZOOM_STEP = 0.1;
  private readonly COLOR_STOPS = [
    { pos: 0, color: [133, 99, 0] },
    { pos: 0.33, color: [155, 85, 0] },
    { pos: 0.66, color: [177, 71, 0] },
    { pos: 1, color: [153, 0, 0] },
  ];

  private heatmapConfigured = false;
  private heatmapLoading = false;

  ngOnInit(): void {
    this.initBpmnViewer();
    this.loadAvailableDiagrams();
    this.setupKeyboardNavigation();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.removeBpmnLogo();
      this.setupCustomInteractions();
      this.setupResizeObserver();
      this.initializeHeatmap();
      this.initializeTaskClickHandlers();
    }, 500);
  }

  ngOnDestroy(): void {
    if (this.bpmnViewer) this.bpmnViewer.destroy();
    if (this.resizeObserver) this.resizeObserver.disconnect();
    this.hideTooltip();
  }

  private initBpmnViewer(): void {
    this.bpmnViewer = new BpmnJS({
      container: this.bpmnContainer.nativeElement,
      keyboard: { bindTo: window },
      additionalModules: [],
      zoomScroll: { enabled: true, modifierKey: null },
      moveCanvas: { enabled: true },
    });

    this.canvas = this.bpmnViewer.get('canvas');
    this.elementRegistry = this.bpmnViewer.get('elementRegistry');

    this.bpmnViewer.on('import.done', (event: any) => {
      if (event.error) {
        this.error = `Error al importar el diagrama: ${event.error.message}`;
        return;
      }

      this.error = null;
      setTimeout(() => {
        this.resetZoom();
        this.updateCurrentZoom();
        this.generateTagsForAllTasks();
        this.injectTaskTags();
        if (this.showHeatmap) this.updateHeatmap();

        this.addClickHandlersToTaskElements();
      }, 500);

      setTimeout(this.removeBpmnLogo.bind(this), 300);
    });

    const eventBus = this.bpmnViewer.get('eventBus');
    if (eventBus?.on) {
      eventBus.on('canvas.viewbox.changed', () => {
        this.viewBox = this.canvas.viewbox();
        this.updateCurrentZoom();
        this.updateTagsPositions();
        if (this.showHeatmap) this.updateHeatmap();
      });
    }
  }

  private initializeTaskClickHandlers(): void {
    if (!this.bpmnViewer) return;

    const eventBus = this.bpmnViewer.get('eventBus');
    if (eventBus?.on) {
      eventBus.on('element.click', (event: any) => {
        if (this.isCanvasDragging) return;

        const element = event.element;
        if (element?.type?.includes('Task')) {
          this.showTooltip(event.originalEvent, element.id);
        } else if (
          !this.tooltipElement ||
          (event.originalEvent.target instanceof HTMLElement &&
            !event.originalEvent.target.closest('.bpmn-task-tooltip'))
        ) {
          this.hideTooltip();
        }
      });
    }

    setTimeout(() => {
      this.addClickHandlersToTaskElements();
    }, 500);
  }

  private addClickHandlersToTaskElements(): void {
    if (!this.elementRegistry) return;

    const taskElements = this.elementRegistry
      .getAll()
      .filter((element: any) => (element.type || '').includes('Task'));

    taskElements.forEach((task: any) => {
      try {
        if (this.elementRegistry._elements?.[task.id]) {
          const gfx = this.elementRegistry._elements[task.id].gfx;
          if (gfx) {
            gfx.addEventListener('click', (event: MouseEvent) => {
              if (!this.isCanvasDragging) {
                event.stopPropagation();
                this.showTooltip(event, task.id);
              }
            });
          }
        }
      } catch (e) {}
    });

    this.bpmnContainer.nativeElement.addEventListener(
      'click',
      (event: MouseEvent) => {
        if (
          this.tooltipElement &&
          event.target instanceof HTMLElement &&
          !event.target.closest('.bpmn-task-tooltip') &&
          !event.target.closest('.djs-element[data-element-id]')
        ) {
          this.hideTooltip();
        }
      }
    );
  }

  private showTooltip(event: MouseEvent, taskId: string): void {
    if (this.activeTaskId === taskId && this.tooltipElement) return;

    this.hideTooltip();

    if (this.isCanvasDragging) return;

    const task = this.taskTags.find((tag) => tag.taskId === taskId);
    if (!task) return;

    const element = this.elementRegistry.get(taskId);
    if (!element) return;

    this.activeTaskId = taskId;

    this.tooltipElement = document.createElement('div');
    this.tooltipElement.className = 'bpmn-task-tooltip';
    this.tooltipElement.setAttribute('data-task-id', taskId);
    this.tooltipElement.style.zIndex = '9999';

    const header = document.createElement('div');
    header.style.position = 'relative';

    const closeButton = document.createElement('button');
    closeButton.className = 'tooltip-close-btn';
    closeButton.innerHTML = '&times;';
    closeButton.style.right = '0';
    closeButton.style.left = 'auto';
    closeButton.onclick = (e) => {
      e.stopPropagation();
      this.hideTooltip();
    };
    header.appendChild(closeButton);

    const title = document.createElement('div');
    title.className = 'tooltip-title';
    title.style.paddingRight = '30px';
    title.style.paddingLeft = '10px';
    title.textContent = element.businessObject?.name || element.id || 'Task';
    header.appendChild(title);

    this.tooltipElement.appendChild(header);

    const content = document.createElement('div');
    content.className = 'tooltip-content';

    const idInfo = document.createElement('div');
    idInfo.className = 'tooltip-info';
    idInfo.innerHTML = `<span class="tooltip-label">ID:</span> <span class="tooltip-value">${task.taskId}</span>`;
    content.appendChild(idInfo);

    if (task.time) {
      const timeInfo = document.createElement('div');
      timeInfo.className = 'tooltip-info';
      timeInfo.innerHTML = `<span class="tooltip-label"><img src="../../../assets/icons/time.svg" class="tag-icon" alt="Time Icon"/> Tiempo:</span> <span class="tooltip-value">${task.time.value}</span>`;
      content.appendChild(timeInfo);
    }

    if (task.instances) {
      const instancesInfo = document.createElement('div');
      instancesInfo.className = 'tooltip-info';
      instancesInfo.innerHTML = `<span class="tooltip-label"><img src="../../../assets/icons/instances.svg" class="tag-icon" alt="Instances Icon"/> Instancias:</span> <span class="tooltip-value">${task.instances.value.toLocaleString()}</span>`;
      content.appendChild(instancesInfo);
    }

    if (task.incidents) {
      const incidentsInfo = document.createElement('div');
      incidentsInfo.className = 'tooltip-info';
      incidentsInfo.innerHTML = `<span class="tooltip-label"><img src="../../../assets/icons/incidents.svg" class="tag-icon" alt="Incidents Icon"/> Incidentes:</span> <span class="tooltip-value">${task.incidents.value}</span>`;
      content.appendChild(incidentsInfo);
    }

    if (element.type) {
      const typeInfo = document.createElement('div');
      typeInfo.className = 'tooltip-info';
      typeInfo.innerHTML = `<span class="tooltip-label">Tipo:</span> <span class="tooltip-value">${element.type.replace(
        'Task',
        ' Task'
      )}</span>`;
      content.appendChild(typeInfo);
    }

    this.tooltipElement.appendChild(content);

    this.tooltipElement.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    const position = this.canvas.getAbsoluteBBox(element);

    const tooltipContainerEl = this.tooltipContainer.nativeElement;
    tooltipContainerEl.appendChild(this.tooltipElement);

    this.tooltipElement.style.position = 'absolute';
    const taskCenterX = position.x + position.width / 2;
    const tooltipWidth = 300;

    this.tooltipElement.style.left = `${taskCenterX - tooltipWidth / 2}px`;

    this.tooltipElement.style.top = `${position.y - 200}px`;

    setTimeout(() => {
      this.adjustTooltipPosition();
    }, 0);

    setTimeout(() => {
      document.addEventListener('click', this.handleDocumentClick);
    }, 0);
  }

  private hideTooltip(): void {
    if (this.tooltipElement) {
      if (
        this.tooltipElement.parentElement ===
        this.tooltipContainer.nativeElement
      ) {
        this.tooltipContainer.nativeElement.removeChild(this.tooltipElement);
      } else if (
        this.tooltipElement.parentElement === this.bpmnContainer.nativeElement
      ) {
        this.bpmnContainer.nativeElement.removeChild(this.tooltipElement);
      } else if (this.tooltipElement.parentElement === document.body) {
        document.body.removeChild(this.tooltipElement);
      }

      this.tooltipElement = null;
      this.activeTaskId = null;

      document.removeEventListener('click', this.handleDocumentClick);
    }
  }

  private readonly handleDocumentClick = (event: MouseEvent) => {
    if (
      this.tooltipElement &&
      event.target instanceof Node &&
      !this.tooltipElement.contains(event.target)
    ) {
      this.hideTooltip();
    }
  };

  private adjustTooltipPosition(): void {
    if (!this.tooltipElement) return;

    const tooltipEl = this.tooltipElement;
    const tooltipRect = tooltipEl.getBoundingClientRect();
    const containerRect =
      this.bpmnContainer.nativeElement.getBoundingClientRect();
    const margin = 15;
    const relativeLeft = parseFloat(tooltipEl.style.left || '0');
    const relativeTop = parseFloat(tooltipEl.style.top || '0');

    this.adjustHorizontalPosition(
      tooltipEl,
      tooltipRect,
      containerRect,
      margin,
      relativeLeft
    );

    if (this.activeTaskId) {
      const element = this.elementRegistry.get(this.activeTaskId);
      const activePosition = element
        ? this.canvas.getAbsoluteBBox(element)
        : null;
      this.adjustVerticalPosition(
        tooltipEl,
        tooltipRect,
        containerRect,
        margin,
        relativeTop,
        activePosition
      );
      if (activePosition) {
        this.adjustArrowPosition(tooltipEl, tooltipRect, activePosition);
      }
    }

    tooltipEl.style.filter = 'drop-shadow(0 10px 16px rgba(0,0,0,0.2))';
  }

  private adjustHorizontalPosition(
    tooltipEl: HTMLElement,
    tooltipRect: DOMRect,
    containerRect: DOMRect,
    margin: number,
    relativeLeft: number
  ): void {
    if (tooltipRect.right > containerRect.right - margin) {
      const overflowX = tooltipRect.right - containerRect.right + margin;
      tooltipEl.style.left = `${relativeLeft - overflowX}px`;
    } else if (tooltipRect.left < containerRect.left + margin) {
      tooltipEl.style.left = `${margin}px`;
    }
  }

  private adjustVerticalPosition(
    tooltipEl: HTMLElement,
    tooltipRect: DOMRect,
    containerRect: DOMRect,
    margin: number,
    relativeTop: number,
    activePosition: {
      x: number;
      y: number;
      width: number;
      height: number;
    } | null
  ): void {
    if (tooltipRect.bottom > containerRect.bottom - margin) {
      if (activePosition) {
        tooltipEl.style.top = `${activePosition.y - tooltipRect.height - 10}px`;
      } else {
        tooltipEl.style.top = `${
          relativeTop - (tooltipRect.bottom - containerRect.bottom + margin)
        }px`;
      }
    } else if (tooltipRect.top < containerRect.top + margin) {
      if (activePosition) {
        tooltipEl.style.top = `${
          activePosition.y + activePosition.height + 10
        }px`;
      } else {
        tooltipEl.style.top = `${margin}px`;
      }
    }
  }

  private adjustArrowPosition(
    tooltipEl: HTMLElement,
    tooltipRect: DOMRect,
    activePosition: { x: number; y: number; width: number; height: number }
  ): void {
    const taskCenterX = activePosition.x + activePosition.width / 2;
    const taskTop = activePosition.y;
    const taskBottom = activePosition.y + activePosition.height;
    const tooltipTop = parseFloat(tooltipEl.style.top);
    const tooltipBottom = tooltipTop + tooltipRect.height;

    if (tooltipBottom <= taskTop + 5) {
      tooltipEl.style.setProperty('--arrow-position', 'bottom');
      tooltipEl.style.setProperty(
        '--arrow-offset',
        `${taskCenterX - parseFloat(tooltipEl.style.left)}px`
      );
    } else if (tooltipTop >= taskBottom - 5) {
      tooltipEl.style.setProperty('--arrow-position', 'top');
      tooltipEl.style.setProperty(
        '--arrow-offset',
        `${taskCenterX - parseFloat(tooltipEl.style.left)}px`
      );
    }
  }

  private setupKeyboardNavigation(): void {
    document.addEventListener('keydown', (event) => {
      if (!this.canvas) return;

      const viewbox = this.canvas.viewbox();
      const moveStep = 30 / viewbox.scale;
      let handled = true;

      switch (event.key) {
        case 'ArrowUp':
          viewbox.y -= moveStep;
          break;
        case 'ArrowDown':
          viewbox.y += moveStep;
          break;
        case 'ArrowLeft':
          viewbox.x -= moveStep;
          break;
        case 'ArrowRight':
          viewbox.x += moveStep;
          break;
        default:
          handled = false;
      }

      if (handled) {
        this.canvas.viewbox(viewbox);
        event.preventDefault();
      }
    });
  }

  private setupResizeObserver(): void {
    if (typeof ResizeObserver === 'undefined') return;

    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (
          entry.target === this.bpmnContainer.nativeElement &&
          this.showHeatmap &&
          this.heatmapConfigured
        ) {
          this.adjustHeatmapContainer();
          this.updateHeatmap();
        }
      }
    });

    this.resizeObserver.observe(this.bpmnContainer.nativeElement);
  }

  private setupCustomInteractions(): void {
    const container = this.bpmnContainer?.nativeElement;
    if (!container) return;

    container.addEventListener('wheel', this.handleWheel.bind(this), {
      passive: false,
    });

    let isDragging = false;
    let hasMoved = false;
    let startX = 0;
    let startY = 0;
    let lastX = 0;
    let lastY = 0;
    let wasHeatmapVisible = false;
    const DRAG_THRESHOLD = 3;

    container.addEventListener('mousedown', (event: MouseEvent) => {
      if (event.button !== 0) return;

      if (
        event.target instanceof HTMLElement &&
        event.target.closest('.bpmn-task-tooltip')
      ) {
        return;
      }

      isDragging = true;
      hasMoved = false;
      this.isCanvasDragging = false;
      startX = event.clientX;
      startY = event.clientY;
      lastX = event.clientX;
      lastY = event.clientY;
      container.style.cursor = 'grabbing';

      wasHeatmapVisible = this.showHeatmap;
      if (wasHeatmapVisible) {
        this.showHeatmap = false;
        this.heatmapContainer.nativeElement.style.display = 'none';
      }
    });

    container.addEventListener('mousemove', (event: MouseEvent) => {
      if (!isDragging || !this.canvas) return;

      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;

      const totalDX = Math.abs(event.clientX - startX);
      const totalDY = Math.abs(event.clientY - startY);

      if (totalDX > DRAG_THRESHOLD || totalDY > DRAG_THRESHOLD) {
        hasMoved = true;
        this.isCanvasDragging = true;
      }

      if (dx === 0 && dy === 0) return;

      const viewbox = this.canvas.viewbox();
      viewbox.x -= dx / viewbox.scale;
      viewbox.y -= dy / viewbox.scale;
      this.canvas.viewbox(viewbox);

      this.viewBox = viewbox;
      lastX = event.clientX;
      lastY = event.clientY;
      this.updateTagsPositions();
    });

    const endDrag = () => {
      if (!isDragging) return;

      if (!hasMoved) {
        this.isCanvasDragging = false;
      } else {
        setTimeout(() => {
          this.isCanvasDragging = false;
        }, 100);
      }

      isDragging = false;
      container.style.cursor = 'grab';

      if (wasHeatmapVisible) {
        setTimeout(() => {
          this.showHeatmap = true;
          this.heatmapContainer.nativeElement.style.display = 'block';
          this.updateHeatmap();
        }, 100);
      }
    };

    container.addEventListener('mouseup', endDrag);
    container.addEventListener('mouseleave', endDrag);
  }

  private handleWheel(event: WheelEvent): void {
    if (!this.canvas) return;

    event.preventDefault();
    const delta = event.deltaY || event.detail || 0;
    const newZoom =
      delta > 0
        ? Math.max(this.currentZoom - this.ZOOM_STEP, this.MIN_ZOOM)
        : Math.min(this.currentZoom + this.ZOOM_STEP, this.MAX_ZOOM);

    this.canvas.zoom(newZoom, { x: event.clientX, y: event.clientY });
    this.updateCurrentZoom();
  }

  private generateTagsForAllTasks(): void {
    if (!this.elementRegistry) return;

    this.taskTags = [];
    const taskElements = this.elementRegistry
      .getAll()
      .filter((element: any) => (element.type || '').includes('Task'));

    taskElements.forEach((task: any) => {
      const taskTag: TaskTag = { taskId: task.id };

      if (Math.random() > 0.2) {
        taskTag.time = {
          value: this.generateRandomTime(),
          visible: true,
        };
      }

      if (Math.random() > 0.3) {
        taskTag.instances = {
          value: this.generateRandomNumber(0, 10000),
          visible: true,
        };
      }

      if (Math.random() > 0.5) {
        taskTag.incidents = {
          value: this.generateRandomNumber(0, 50),
          visible: true,
        };
      }

      if (taskTag.time || taskTag.instances || taskTag.incidents) {
        this.taskTags.push(taskTag);
      }
    });
  }

  private generateRandomTime(): string {
    const hours = this.generateRandomNumber(0, 24);
    const minutes = this.generateRandomNumber(0, 59);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  }

  private generateRandomNumber(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private injectTaskTags(): void {
    if (!this.elementRegistry || !this.canvas) return;

    document.querySelectorAll('.bpmn-task-tags').forEach((tag) => tag.remove());

    const timeValues = this.calculateTimeRange();
    const minTimeMinutes = timeValues.min;
    const maxTimeMinutes = timeValues.max;

    const diagramContainer = this.bpmnContainer.nativeElement;

    this.taskTags.forEach((tag) => {
      const element = this.elementRegistry.get(tag.taskId);
      if (!element) return;

      const tagContainer = document.createElement('div');
      tagContainer.className = 'bpmn-task-tags';
      tagContainer.dataset['taskId'] = tag.taskId;

      let hasAnyTag = false;

      if (tag.time?.visible && this.showTimeTags) {
        const timeTag = this.createTimeTag(
          tag.time.value,
          minTimeMinutes,
          maxTimeMinutes
        );
        tagContainer.appendChild(timeTag);
        hasAnyTag = true;
      }

      if (tag.instances?.visible && this.showInstanceTags) {
        const instancesTag = document.createElement('div');
        instancesTag.className = 'bpmn-tag bpmn-tag-instances';
        instancesTag.innerHTML = `<img src="../../../assets/icons/instances.svg" class="tag-icon" alt="Instances Icon"/> ${tag.instances.value}`;
        instancesTag.dataset['type'] = 'instances';
        tagContainer.appendChild(instancesTag);
        hasAnyTag = true;
      }

      if (tag.incidents?.visible && this.showIncidentTags) {
        const incidentsTag = document.createElement('div');
        incidentsTag.className = 'bpmn-tag bpmn-tag-incidents';
        incidentsTag.innerHTML = `<img src="../../../assets/icons/incidents.svg" class="tag-icon" alt="Incidents Icon"/> ${tag.incidents.value}`;
        incidentsTag.dataset['type'] = 'incidents';
        tagContainer.appendChild(incidentsTag);
        hasAnyTag = true;
      }

      if (hasAnyTag) {
        diagramContainer.appendChild(tagContainer);
        this.positionTagsForElement(element, tagContainer);
      }
    });
  }

  private calculateTimeRange() {
    let min = Infinity;
    let max = 0;

    this.taskTags.forEach((tag) => {
      if (tag.time?.visible && this.showTimeTags) {
        const minutes = this.parseTimeToMinutes(tag.time.value);
        if (minutes < min) min = minutes;
        if (minutes > max) max = minutes;
      }
    });

    if (min === Infinity) min = 0;
    if (max === 0) max = 120;

    return { min, max };
  }

  private createTimeTag(
    timeValue: string,
    minMinutes: number,
    maxMinutes: number
  ) {
    const timeTag = document.createElement('div');
    timeTag.className = 'bpmn-tag';

    const timeMinutes = this.parseTimeToMinutes(timeValue);
    const timeColor = this.getTimeColor(timeMinutes, minMinutes, maxMinutes);

    timeTag.style.backgroundColor = timeColor;
    timeTag.style.color = this.isLightColor(timeColor) ? 'black' : 'white';
    timeTag.innerHTML = `<img src="../../../assets/icons/time.svg" class="tag-icon" alt="Time Icon"/> ${timeValue}`;
    timeTag.dataset['type'] = 'time';

    return timeTag;
  }

  private parseTimeToMinutes(timeStr: string): number {
    const hoursMatch = /(\d+)h/.exec(timeStr);
    const minutesMatch = /(\d+)m/.exec(timeStr);

    let totalMinutes = 0;
    if (hoursMatch?.[1]) totalMinutes += parseInt(hoursMatch[1], 10) * 60;
    if (minutesMatch?.[1]) totalMinutes += parseInt(minutesMatch[1], 10);

    return totalMinutes;
  }

  private getTimeColor(value: number, min: number, max: number): string {
    let normalizedValue = (value - min) / (max - min);
    normalizedValue = isNaN(normalizedValue)
      ? 0
      : Math.max(0, Math.min(1, normalizedValue));

    if (normalizedValue === 1) {
      return '#990000';
    }

    if (normalizedValue === 0) {
      return '#856300';
    }

    let startColor = this.COLOR_STOPS[0].color;
    let endColor = this.COLOR_STOPS[1].color;
    let startPos = this.COLOR_STOPS[0].pos;
    let endPos = this.COLOR_STOPS[1].pos;

    for (let i = 0; i < this.COLOR_STOPS.length - 1; i++) {
      if (
        normalizedValue >= this.COLOR_STOPS[i].pos &&
        normalizedValue <= this.COLOR_STOPS[i + 1].pos
      ) {
        startColor = this.COLOR_STOPS[i].color;
        endColor = this.COLOR_STOPS[i + 1].color;
        startPos = this.COLOR_STOPS[i].pos;
        endPos = this.COLOR_STOPS[i + 1].pos;
        break;
      }
    }

    const segmentPos = (normalizedValue - startPos) / (endPos - startPos);
    const r = Math.round(
      startColor[0] + segmentPos * (endColor[0] - startColor[0])
    );
    const g = Math.round(
      startColor[1] + segmentPos * (endColor[1] - startColor[1])
    );
    const b = Math.round(
      startColor[2] + segmentPos * (endColor[2] - startColor[2])
    );

    return `rgb(${r}, ${g}, ${b})`;
  }

  private isLightColor(color: string): boolean {
    const rgb = /^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/.exec(color);
    if (!rgb) return false;

    const r = parseInt(rgb[1], 10) / 255;
    const g = parseInt(rgb[2], 10) / 255;
    const b = parseInt(rgb[3], 10) / 255;

    return 0.299 * r + 0.587 * g + 0.114 * b > 0.5;
  }

  private positionTagsForElement(
    element: any,
    tagContainer: HTMLElement
  ): void {
    if (!element || !this.canvas) return;

    const position = this.canvas.getAbsoluteBBox(element);
    const scale = this.currentZoom;

    const verticalOffset =
      2 +
      (scale <= this.MAX_ZOOM
        ? Math.max(
            0,
            Math.min(
              1,
              (scale - this.MIN_ZOOM) / (this.MAX_ZOOM - this.MIN_ZOOM)
            )
          ) * 5
        : 5);

    tagContainer.style.left = `${position.x}px`;
    tagContainer.style.top = `${
      position.y + position.height + verticalOffset
    }px`;
    tagContainer.style.transform = `scale(${scale})`;
    tagContainer.style.transformOrigin = 'left top';
  }

  private updateTagsPositions(): void {
    if (!this.elementRegistry || !this.canvas) return;

    document.querySelectorAll('.bpmn-task-tags').forEach((container) => {
      const taskId = (container as HTMLElement).dataset['taskId'];
      if (!taskId) return;

      const element = this.elementRegistry.get(taskId);
      if (element)
        this.positionTagsForElement(element, container as HTMLElement);
    });
  }

  updateTagsVisibility(): void {
    this.injectTaskTags();
  }

  private initializeHeatmap(): void {
    this.loadHeatmapLibrary()
      .then(() => this.configureHeatmap())
      .catch(() => {
        this.error = 'No se pudo cargar la biblioteca de mapa de calor';
        this.configureFallbackHeatmap();
      });
  }

  private async loadHeatmapLibrary(): Promise<void> {
    if (this.heatmapLoading) {
      return new Promise((resolve, reject) => {
        const checkInterval = setInterval(() => {
          if (this.h337) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 200);

        setTimeout(() => {
          clearInterval(checkInterval);
          reject(new Error('Timeout loading heatmap.js'));
        }, 5000);
      });
    }

    this.heatmapLoading = true;

    if (typeof (window as any).h337 !== 'undefined') {
      this.h337 = (window as any).h337;
      this.heatmapLoading = false;
      return Promise.resolve();
    }

    return new Promise<void>((resolve, reject) => {
      const script = this.renderer.createElement('script');
      this.renderer.setAttribute(script, 'src', 'assets/heatmap.min.js');

      script.onload = () => {
        if (typeof (window as any).h337 !== 'undefined') {
          this.h337 = (window as any).h337;
          this.heatmapLoading = false;
          resolve();
        } else {
          this.heatmapLoading = false;
          reject(new Error('Heatmap library loaded but h337 not defined'));
        }
      };

      script.onerror = () => {
        this.heatmapLoading = false;
        reject(new Error('Failed to load heatmap library'));
      };

      this.renderer.appendChild(document.body, script);
    });
  }

  private configureHeatmap(): void {
    if (!this.h337) {
      this.configureFallbackHeatmap();
      return;
    }

    const container = this.heatmapContainer.nativeElement;
    while (container.firstChild) container.removeChild(container.firstChild);

    try {
      this.adjustHeatmapContainer();

      this.heatmapInstance = this.h337.create({
        container: container,
        radius: 18,
        maxOpacity: 0.45,
        minOpacity: 0.1,
        blur: 0.7,
        gradient: {
          0.1: 'blue',
          0.3: 'cyan',
          0.5: 'lime',
          0.7: 'yellow',
          0.9: 'orange',
          1.0: 'red',
        },
      });

      this.heatmapConfigured = true;
      container.style.display = this.showHeatmap ? 'block' : 'none';
    } catch (error) {
      this.configureFallbackHeatmap();
    }
  }

  private configureFallbackHeatmap(): void {
    const container = this.heatmapContainer.nativeElement;
    while (container.firstChild) container.removeChild(container.firstChild);

    this.adjustHeatmapContainer();

    const canvas = this.renderer.createElement('canvas');
    this.renderer.setAttribute(
      canvas,
      'width',
      container.offsetWidth.toString()
    );
    this.renderer.setAttribute(
      canvas,
      'height',
      container.offsetHeight.toString()
    );
    this.renderer.setStyle(canvas, 'position', 'absolute');
    this.renderer.setStyle(canvas, 'top', '0');
    this.renderer.setStyle(canvas, 'left', '0');
    this.renderer.setStyle(canvas, 'width', '100%');
    this.renderer.setStyle(canvas, 'height', '100%');
    this.renderer.setStyle(canvas, 'pointer-events', 'none');

    this.renderer.appendChild(container, canvas);

    this.heatmapInstance = {
      setData: (data: any) => this.drawFallbackHeatmap(canvas, data),
      _renderer: {
        setDimensions: (width: number, height: number) => {
          canvas.width = width;
          canvas.height = height;
        },
      },
    };

    this.heatmapConfigured = true;
    container.style.display = this.showHeatmap ? 'block' : 'none';
  }

  private adjustHeatmapContainer(): void {
    const bpmnRect = this.bpmnContainer.nativeElement.getBoundingClientRect();
    const heatmapContainer = this.heatmapContainer.nativeElement;

    this.renderer.setStyle(heatmapContainer, 'width', `${bpmnRect.width}px`);
    this.renderer.setStyle(heatmapContainer, 'height', `${bpmnRect.height}px`);

    if (this.heatmapInstance?._renderer?.setDimensions) {
      try {
        this.heatmapInstance._renderer.setDimensions(
          bpmnRect.width,
          bpmnRect.height
        );
      } catch (error) {}
    }
  }

  toggleHeatmap(): void {
    if (!this.heatmapConfigured) {
      if (this.h337 || this.heatmapLoading) {
        this.configureHeatmap();
      } else {
        this.loadHeatmapLibrary()
          .then(() => {
            this.configureHeatmap();
            this.updateHeatmapVisibility();
          })
          .catch(() => {
            this.configureFallbackHeatmap();
            this.updateHeatmapVisibility();
          });
        return;
      }
    }

    this.updateHeatmapVisibility();
  }

  private updateHeatmapVisibility(): void {
    if (this.showHeatmap) {
      this.heatmapContainer.nativeElement.style.display = 'block';
      this.adjustHeatmapContainer();
      this.updateHeatmap();
    } else {
      this.heatmapContainer.nativeElement.style.display = 'none';
    }
  }

  private updateHeatmap(): void {
    if (!this.heatmapConfigured || !this.showHeatmap || !this.heatmapInstance)
      return;

    this.ngZone.runOutsideAngular(() => {
      try {
        this.adjustHeatmapContainer();
        if (this.canvas) this.viewBox = this.canvas.viewbox();

        const tasksWithInstances = this.taskTags.filter(
          (tag) => tag.instances?.value && tag.instances.value > 0
        );
        if (tasksWithInstances.length === 0) {
          this.heatmapInstance.setData({ max: 0, data: [] });
          return;
        }

        const { minValue, maxValue } =
          this.calculateHeatmapRange(tasksWithInstances);
        const dataPoints = this.generateHeatmapDataPoints(
          tasksWithInstances,
          minValue,
          maxValue
        );

        if (dataPoints.length === 0) {
          this.heatmapInstance.setData({ max: 0, data: [] });
          return;
        }

        this.heatmapInstance.setData({
          max: maxValue,
          min: minValue,
          data: dataPoints,
        });
      } catch (error) {
        if (
          this.showHeatmap &&
          (!this.heatmapInstance || !this.heatmapConfigured)
        ) {
          setTimeout(() => this.configureHeatmap(), 1000);
        }
      }
    });
  }

  private calculateHeatmapRange(tasks: TaskTag[]) {
    let minValue = Infinity;
    let maxValue = -Infinity;

    tasks.forEach((tag) => {
      const instanceValue = tag.instances!.value;
      const incidentValue = tag.incidents?.value ?? 0;
      const heatValue = instanceValue + incidentValue * 2;

      if (heatValue < minValue) minValue = heatValue;
      if (heatValue > maxValue) maxValue = heatValue;
    });

    if (minValue === Infinity) minValue = 0;
    if (maxValue === -Infinity) maxValue = 100;
    if (minValue === maxValue) minValue = maxValue * 0.8;

    return { minValue, maxValue };
  }

  private generateHeatmapDataPoints(
    tasks: TaskTag[],
    minValue: number,
    maxValue: number
  ) {
    return tasks
      .map((tag) => {
        try {
          const element = this.elementRegistry.get(tag.taskId);
          if (!element) return null;

          const position = this.canvas.getAbsoluteBBox(element);
          const instanceValue = tag.instances!.value;
          const incidentValue = tag.incidents?.value ?? 0;
          const heatValue = instanceValue + incidentValue * 2;

          let taskWidth = position.width;
          let taskHeight = position.height;

          try {
            if (this.elementRegistry._elements?.[tag.taskId]) {
              const gfx = this.elementRegistry._elements[tag.taskId].gfx;
              const visualRect = gfx?.querySelector('.djs-visual rect');

              if (visualRect) {
                const rectWidth = parseFloat(visualRect.getAttribute('width'));
                const rectHeight = parseFloat(
                  visualRect.getAttribute('height')
                );

                if (!isNaN(rectWidth) && !isNaN(rectHeight)) {
                  taskWidth = rectWidth;
                  taskHeight = rectHeight;
                }
              }
            }
          } catch (e) {}

          let normalizedValue =
            maxValue === minValue
              ? 0.5
              : (heatValue - minValue) / (maxValue - minValue);
          const baseRadius = Math.min(taskWidth, taskHeight) * 0.6;
          const radiusScale = 0.5 + normalizedValue * 0.5;

          return {
            x: Math.round(position.x + position.width / 2),
            y: Math.round(position.y + position.height / 2),
            value: heatValue,
            radius: Math.min(baseRadius * radiusScale, 30),
            hasIncidents: incidentValue > 0,
          };
        } catch (error) {
          return null;
        }
      })
      .filter((point) => point !== null) as any[];
  }

  private drawFallbackHeatmap(canvas: HTMLCanvasElement, data: any): void {
    if (!data?.data?.length) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (
      canvas.width !== canvas.offsetWidth ||
      canvas.height !== canvas.offsetHeight
    ) {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }

    const points = data.data;
    const max = data.max || 1;

    points.forEach((point: any) => {
      const intensity = Math.pow(point.value / max, 0.7);
      const radius = point.radius || 25;

      const scaledX = point.x * this.currentZoom;
      const scaledY = point.y * this.currentZoom;
      const offsetX = -this.viewBox.x * this.currentZoom;
      const offsetY = -this.viewBox.y * this.currentZoom;
      const finalX = scaledX + offsetX;
      const finalY = scaledY + offsetY;

      if (
        finalX + radius < 0 ||
        finalY + radius < 0 ||
        finalX - radius > canvas.width ||
        finalY - radius > canvas.height
      ) {
        return;
      }

      const gradient = ctx.createRadialGradient(
        finalX,
        finalY,
        0,
        finalX,
        finalY,
        radius * this.currentZoom
      );

      const color = this.getHeatColor(intensity);
      gradient.addColorStop(0, color);
      gradient.addColorStop(0.7, color.replace(/,[^,]+\)$/, ',0.3)'));
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.beginPath();
      ctx.arc(finalX, finalY, radius * this.currentZoom, 0, 2 * Math.PI);
      ctx.fillStyle = gradient;
      ctx.fill();
    });
  }

  private getHeatColor(intensity: number): string {
    const alpha = Math.min(intensity * 3.5, 0.7);

    if (intensity < 0.2) return `rgba(0, 0, 255, ${alpha})`;
    if (intensity < 0.4) return `rgba(0, 255, 255, ${alpha})`;
    if (intensity < 0.6) return `rgba(0, 255, 0, ${alpha})`;
    if (intensity < 0.8) return `rgba(255, 255, 0, ${alpha})`;
    return `rgba(255, 0, 0, ${alpha})`;
  }

  private removeBpmnLogo(): void {
    try {
      document.querySelectorAll('.bjs-powered-by').forEach((element) => {
        if (element instanceof HTMLElement) element.style.display = 'none';
      });

      const container = this.bpmnContainer.nativeElement;
      if (container) {
        container
          .querySelectorAll('.bjs-powered-by')
          .forEach((element: Element) => element.remove());
      }

      const style = document.createElement('style');
      style.textContent = `.bjs-powered-by { display: none !important; }`;
      document.head.appendChild(style);
    } catch (error) {}
  }

  loadDiagram(): void {
    if (!this.selectedDiagram) return;

    const previousStates = {
      showTimeTags: this.showTimeTags,
      showInstanceTags: this.showInstanceTags,
      showIncidentTags: this.showIncidentTags,
      showHeatmap: this.showHeatmap,
    };

    this.showTimeTags = false;
    this.showInstanceTags = false;
    this.showIncidentTags = false;
    this.showHeatmap = false;

    this.updateTagsVisibility();
    this.updateHeatmapVisibility();

    this.http
      .get(`/bpmn/${this.selectedDiagram}`, { responseType: 'text' })
      .subscribe({
        next: (xml) => {
          this.bpmnViewer
            .importXML(xml)
            .catch((err: any) => {
              this.error = `Error al importar el diagrama: ${err.message}`;
            })
            .finally(() => {
              setTimeout(() => {
                this.showTimeTags = previousStates.showTimeTags;
                this.showInstanceTags = previousStates.showInstanceTags;
                this.showIncidentTags = previousStates.showIncidentTags;
                this.showHeatmap = previousStates.showHeatmap;

                this.updateTagsVisibility();
                this.updateHeatmapVisibility();
              }, 500);
            });
        },
        error: (err) => {
          this.error = `Error al cargar el archivo ${this.selectedDiagram}: ${err.message}`;
        },
      });
  }

  zoomIn(): void {
    if (!this.canvas?.zoom) return;
    this.canvas.zoom(
      Math.min(this.currentZoom + this.ZOOM_STEP, this.MAX_ZOOM)
    );
    this.updateCurrentZoom();
  }

  zoomOut(): void {
    if (!this.canvas?.zoom) return;
    this.canvas.zoom(
      Math.max(this.currentZoom - this.ZOOM_STEP, this.MIN_ZOOM)
    );
    this.updateCurrentZoom();
  }

  resetZoom(): void {
    if (!this.canvas?.zoom) return;
    this.canvas.zoom('fit-viewport');
    this.updateCurrentZoom();
  }

  private updateCurrentZoom(): void {
    try {
      const zoom = this.canvas?.zoom();
      if (typeof zoom === 'number' && !isNaN(zoom)) {
        this.currentZoom = zoom;
        this.updateTagsPositions();
      }
    } catch (error) {}
  }

  private loadAvailableDiagrams(): void {
    this.http.get<string[]>('/api/bpmn-files').subscribe({
      next: (files) => {
        this.availableDiagrams = files;
        if (this.availableDiagrams.length > 0) {
          this.selectedDiagram = this.availableDiagrams[0];
          this.loadDiagram();
        }
      },
      error: () => {
        this.availableDiagrams = [
          'Application.bpmn',
          'flightBooking.bpmn',
          'hiring.bpmn',
          'hotelBooking.bpmn',
          'travels.bpmn',
          'hiring-old.bpmn',
        ];
        this.selectedDiagram = this.availableDiagrams[0];
        this.loadDiagram();
      },
    });
  }
}
