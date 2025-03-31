import {
  Component,
  OnInit,
  AfterViewInit,
  ElementRef,
  ViewChild,
  NgZone,
  OnDestroy,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import BpmnJS from 'bpmn-js/lib/NavigatedViewer';

@Component({
  selector: 'app-bpmn-viewer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="diagram-container">
      <div class="toolbar">
        <button (click)="zoomIn()">Zoom In</button>
        <button (click)="zoomOut()">Zoom Out</button>
        <button (click)="resetZoom()">Reset Zoom</button>
      </div>
      <div
        class="viewer-container"
        #viewerContainer
        (click)="handleContainerClick($event)"
      >
        <div #bpmnContainer class="bpmn-layer"></div>
        <div #svgContainer class="svg-layer"></div>
        <div
          #tooltipContainer
          class="tooltip-container"
          [style.display]="tooltipVisible ? 'block' : 'none'"
        >
          {{ tooltipText }}
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .diagram-container {
        display: flex;
        flex-direction: column;
        height: 100%;
        width: 100%;
      }

      .toolbar {
        padding: 10px;
        background-color: #f5f5f5;
        border-bottom: 1px solid #ccc;
        z-index: 10;
      }

      .toolbar button {
        margin-right: 10px;
        padding: 5px 10px;
        background-color: #fff;
        border: 1px solid #ccc;
        border-radius: 3px;
        cursor: pointer;
      }

      .toolbar button:hover {
        background-color: #e6e6e6;
      }

      .viewer-container {
        position: relative;
        flex-grow: 1;
        height: 600px;
        border: 1px solid #ccc;
        overflow: hidden;
        cursor: grab;
      }

      .viewer-container.panning {
        cursor: grabbing;
      }

      .bpmn-layer {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 1;
        opacity: 0.1;
      }

      .svg-layer {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 2;
      }

      .tooltip-container {
        position: absolute;
        background-color: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 5px 10px;
        border-radius: 4px;
        font-size: 14px;
        z-index: 1000;
        pointer-events: none;
        max-width: 250px;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
      }

      .highlight-overlay {
        stroke: red;
        stroke-width: 3px;
        stroke-opacity: 0.7;
        fill: none !important;
        pointer-events: none;
      }
    `,
  ],
})
export class BpmnViewerComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('bpmnContainer') private readonly bpmnContainer!: ElementRef;
  @ViewChild('svgContainer') private readonly svgContainer!: ElementRef;
  @ViewChild('tooltipContainer') private readonly tooltipContainer!: ElementRef;
  @ViewChild('viewerContainer') private readonly viewerContainer!: ElementRef;

  private bpmnViewer: any;
  private svgContent: string = '';
  private viewbox: { x: number; y: number; width: number; height: number } = {
    x: 0,
    y: 0,
    width: 1000,
    height: 800,
  };
  private currentZoom: number = 1.0;

  private isPanning: boolean = false;
  private lastX: number = 0;
  private lastY: number = 0;

  private transformObserver: MutationObserver | null = null;
  private currentHighlighted: Element | null = null;

  tooltipVisible: boolean = false;
  tooltipText: string = '';

  constructor(
    private readonly http: HttpClient,
    private readonly zone: NgZone
  ) {}

  ngOnInit(): void {
    this.loadSvgData();
  }

  ngAfterViewInit(): void {
    this.initBpmnViewer();
    this.setupPanning();

    if (this.svgContent && this.svgContainer?.nativeElement) {
      this.displaySvg();
    }
  }

  ngOnDestroy(): void {
    if (this.transformObserver) {
      this.transformObserver.disconnect();
      this.transformObserver = null;
    }
  }

  private setupPanning(): void {
    if (!this.viewerContainer) return;

    const container = this.viewerContainer.nativeElement;

    this.zone.runOutsideAngular(() => {
      container.addEventListener('mousedown', this.handleMouseDown.bind(this));
      container.addEventListener('mousemove', this.handleMouseMove.bind(this));
      container.addEventListener('mouseup', this.handleMouseUp.bind(this));
      container.addEventListener('mouseleave', this.handleMouseUp.bind(this));

      container.addEventListener('wheel', this.handleWheel.bind(this), {
        passive: false,
      });
    });
  }

  private handleMouseDown(event: MouseEvent): void {
    if (event.button !== 0) return;

    this.isPanning = true;
    this.lastX = event.clientX;
    this.lastY = event.clientY;
    this.viewerContainer.nativeElement.classList.add('panning');

    event.preventDefault();
  }

  private handleMouseMove(event: MouseEvent): void {
    if (!this.isPanning) return;

    const deltaX = event.clientX - this.lastX;
    const deltaY = event.clientY - this.lastY;

    this.lastX = event.clientX;
    this.lastY = event.clientY;

    const svgElement = this.svgContainer.nativeElement.querySelector('svg');
    if (!svgElement) return;

    const currentTransform = window.getComputedStyle(svgElement).transform;
    let matrix = new DOMMatrix(currentTransform);

    if (matrix.e === 0 && matrix.f === 0) {
      matrix.e = deltaX / 2;
      matrix.f = deltaY / 2;
    } else {
      matrix.e += deltaX;
      matrix.f += deltaY;
    }

    svgElement.style.transform = matrix.toString();

    if (this.bpmnViewer?.get) {
      const canvas = this.bpmnViewer.get('canvas');
      this.currentZoom = canvas.zoom();
    }
  }

  private handleMouseUp(_event: MouseEvent): void {
    this.isPanning = false;
    this.viewerContainer.nativeElement.classList.remove('panning');
  }

  private handleWheel(event: WheelEvent): void {
    event.preventDefault();

    const svgElement = this.svgContainer.nativeElement.querySelector('svg');
    if (!svgElement) return;

    const delta = event.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = this.currentZoom * delta;

    const rect = this.viewerContainer.nativeElement.getBoundingClientRect();
    const clientX = event.clientX - rect.left;
    const clientY = event.clientY - rect.top;

    const transform = window.getComputedStyle(svgElement).transform;
    let matrix = new DOMMatrix(transform);

    const oldOriginX = clientX;
    const oldOriginY = clientY;

    matrix.m11 = newZoom;
    matrix.m22 = newZoom;

    const originXDiff = oldOriginX * (1 - delta);
    const originYDiff = oldOriginY * (1 - delta);

    matrix.e += originXDiff;
    matrix.f += originYDiff;

    svgElement.style.transform = matrix.toString();

    this.currentZoom = newZoom;

    if (this.bpmnViewer?.get) {
      const canvas = this.bpmnViewer.get('canvas');
      canvas.zoom(newZoom, { x: clientX, y: clientY });
    }
  }

  private loadSvgData(): void {
    this.http.get('assets/data.svg', { responseType: 'text' }).subscribe({
      next: (svgData) => {
        this.svgContent = svgData;
        if (this.svgContainer?.nativeElement) {
          this.displaySvg();
        }
      },
      error: (error) => {
        console.error('Error al cargar el archivo SVG:', error);
      },
    });
  }

  private initBpmnViewer(): void {
    try {
      const emptyBpmn = this.createEmptyBpmn();

      this.bpmnViewer = new BpmnJS({
        container: this.bpmnContainer.nativeElement,
        additionalModules: [],
      });

      this.bpmnViewer.on('import.done', () => {
        this.displaySvg();

        this.removeWatermark();

        const config = this.bpmnViewer.get('config');
        if (config?.canvas) {
          config.canvas.deferUpdate = false;
        }

        this.currentZoom = 1.0;

        const eventBus = this.bpmnViewer.get('eventBus');
        try {
          eventBus.off('canvas.viewbox.changed');
        } catch (e) {
          console.error('Error al desconectar el evento:', e);
        }

        eventBus.on('canvas.viewbox.changed', () => {
          if (this.isPanning) {
            this.syncSvgWithBpmn();
          }
        });
      });

      this.bpmnViewer.importXML(emptyBpmn);
    } catch (error) {
      console.error('Error al inicializar el visor BPMN:', error);
    }
  }

  private createEmptyBpmn(): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
                  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
                  id="Definitions_1"
                  targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="false">
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;
  }

  private displaySvg(): void {
    if (!this.svgContainer || !this.svgContent) return;

    this.zone.runOutsideAngular(() => {
      try {
        this.svgContainer.nativeElement.innerHTML = '';
        this.svgContainer.nativeElement.innerHTML = this.svgContent;

        const svgElement = this.svgContainer.nativeElement.querySelector('svg');
        if (svgElement) {
          const originalViewBox = svgElement.getAttribute('viewBox');
          if (originalViewBox) {
            const [x, y, width, height] = originalViewBox
              .split(/\s+/)
              .map(Number);
            this.viewbox = { x, y, width, height };
          }

          svgElement.style.width = '100%';
          svgElement.style.height = '100%';
          svgElement.style.display = 'block';
          svgElement.style.pointerEvents = 'auto';

          svgElement.style.transformOrigin = '0 0';
          svgElement.style.transform = 'translate(0px, 0px) scale(1)';

          svgElement.setAttribute(
            'data-initial-transform',
            'translate(0px, 0px) scale(1)'
          );

          if (this.transformObserver) {
            this.transformObserver.disconnect();
          }

          this.transformObserver = new MutationObserver((mutations) => {
            if (!this.isPanning && this.currentZoom === 1.0) {
              svgElement.style.transform = 'translate(0px, 0px) scale(1)';
            }
          });

          this.transformObserver.observe(svgElement, {
            attributes: true,
            attributeFilter: ['style'],
          });

          this.setupInteractiveElements();

          setTimeout(() => {
            svgElement.style.transform = 'translate(0px, 0px) scale(1)';
          }, 50);
        }

        this.currentZoom = 1.0;
      } catch (error) {
        console.error('Error al mostrar el SVG:', error);
      }
    });
  }

  private setupInteractiveElements(): void {
    const groups =
      this.svgContainer.nativeElement.querySelectorAll('g[transform]');

    const problemElement = this.svgContainer.nativeElement.querySelector(
      'g[id="_C6E61C53-FD35-4347-B69E-30AA93AE4404"]'
    );
    if (problemElement) {
      problemElement.setAttribute('style', 'pointer-events: none !important;');
      const paths = problemElement.querySelectorAll('path');
      paths.forEach((path: Element) => {
        path.setAttribute('style', 'pointer-events: none !important;');
      });

      const childGroups = problemElement.querySelectorAll('g');
      childGroups.forEach((group: Element) => {
        group.setAttribute('style', 'pointer-events: none !important;');
      });
    }

    groups.forEach((group: Element) => {
      if (group.closest('[id="_C6E61C53-FD35-4347-B69E-30AA93AE4404"]')) {
        return;
      }

      group.addEventListener('click', (event: Event) => {
        event.stopPropagation();
        this.zone.run(() => {
          this.handleElementClick(group, event as MouseEvent);
        });
      });

      group.setAttribute('style', 'pointer-events: all; cursor: pointer;');
    });
  }

  private handleElementClick(element: Element, event: MouseEvent): void {
    if (this.currentHighlighted === element) {
      return;
    }

    this.unhighlightCurrentElement();

    this.highlightElement(element);

    const text = this.findAssociatedText(element);
    if (text) {
      this.showTooltip(event, text);
    }
  }

  handleContainerClick(event: MouseEvent): void {
    if (this.isPanning) return;

    const target = event.target as Element;
    const svgElement = this.svgContainer.nativeElement.querySelector('svg');

    if (
      target === svgElement ||
      target === this.svgContainer.nativeElement ||
      target === this.viewerContainer.nativeElement
    ) {
      this.unhighlightCurrentElement();
      this.hideTooltip();
    }
  }

  private highlightElement(element: Element): void {
    this.unhighlightCurrentElement();

    const paths = element.querySelectorAll('path');
    if (paths.length > 0) {
      paths.forEach((path) => {
        const pathData = path.getAttribute('d');
        if (pathData) {
          const svgElement =
            this.svgContainer.nativeElement.querySelector('svg');
          if (svgElement) {
            const highlightPath = document.createElementNS(
              'http://www.w3.org/2000/svg',
              'path'
            );
            highlightPath.setAttribute('d', pathData);
            highlightPath.setAttribute('class', 'highlight-overlay');
            highlightPath.setAttribute('fill', 'none');
            highlightPath.setAttribute('stroke', 'red');
            highlightPath.setAttribute('stroke-width', '3');
            highlightPath.setAttribute('stroke-opacity', '0.7');
            highlightPath.setAttribute('pointer-events', 'none');
            highlightPath.setAttribute(
              'data-highlight-for',
              element.getAttribute('id') ?? ''
            );

            let transform = '';
            let currentElement: Element | null = path;

            while (currentElement && currentElement !== svgElement) {
              if (currentElement.tagName.toLowerCase() === 'g') {
                const groupTransform = currentElement.getAttribute('transform');
                if (groupTransform) {
                  transform = groupTransform + ' ' + transform;
                }
              }
              currentElement = currentElement.parentElement;
            }

            const highlightGroup = document.createElementNS(
              'http://www.w3.org/2000/svg',
              'g'
            );
            highlightGroup.setAttribute('class', 'highlight-group');
            if (transform) {
              highlightGroup.setAttribute('transform', transform);
            }
            highlightGroup.appendChild(highlightPath);

            svgElement.appendChild(highlightGroup);
          }
        }
      });
    }

    this.currentHighlighted = element;
  }

  private unhighlightCurrentElement(): void {
    if (this.currentHighlighted) {
      const svgElement = this.svgContainer.nativeElement.querySelector('svg');
      if (svgElement) {
        const highlightGroups = svgElement.querySelectorAll('.highlight-group');
        highlightGroups.forEach((group: Element) => {
          svgElement.removeChild(group);
        });
      }

      this.currentHighlighted = null;
    }
  }

  private findAssociatedText(element: Element): string | null {
    const textElements = element.querySelectorAll('text');
    if (textElements && textElements.length > 0) {
      return (
        Array.from(textElements)
          .map((el) => (el as Element).textContent)
          .filter(Boolean)
          .join(' ') || null
      );
    }

    const elementId =
      element.getAttribute('id') ?? element.getAttribute('bpmn2nodeid');
    if (elementId) {
      const relatedElements = this.svgContainer.nativeElement.querySelectorAll(
        `[id*="${elementId}"], [bpmn2nodeid*="${elementId}"]`
      );

      for (const relatedElement of relatedElements) {
        const relatedTextElements = relatedElement.querySelectorAll('text');
        if (relatedTextElements && relatedTextElements.length > 0) {
          return (
            Array.from(relatedTextElements)
              .map((el) => (el as Element).textContent)
              .filter(Boolean)
              .join(' ') || null
          );
        }
      }
    }

    return null;
  }

  private showTooltip(event: MouseEvent, text: string): void {
    this.tooltipText = text;
    this.tooltipVisible = true;
    this.positionTooltipForElement(this.currentHighlighted as Element, event);
  }

  private hideTooltip(): void {
    this.tooltipVisible = false;
  }

  private positionTooltipForElement(element: Element, event: MouseEvent): void {
    if (!this.tooltipContainer || !element) return;

    const tooltip = this.tooltipContainer.nativeElement;
    const containerRect =
      this.svgContainer.nativeElement.getBoundingClientRect();

    const bbox = this.getBoundingBoxForElement(element);
    if (!bbox) {
      this.positionTooltip(event);
      return;
    }

    const elementX = bbox.x + bbox.width;
    const elementY = bbox.y;

    const tooltipWidth = tooltip.offsetWidth;
    const tooltipHeight = tooltip.offsetHeight;
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;

    let posX = elementX + 10;
    let posY = elementY;

    if (posX + tooltipWidth > containerWidth) {
      posX = bbox.x - tooltipWidth - 10;
    }

    if (posY + tooltipHeight > containerHeight) {
      posY = bbox.y + bbox.height - tooltipHeight;
    }

    posX = Math.max(5, Math.min(containerWidth - tooltipWidth - 5, posX));
    posY = Math.max(5, Math.min(containerHeight - tooltipHeight - 5, posY));

    tooltip.style.left = `${posX}px`;
    tooltip.style.top = `${posY}px`;
  }

  private getBoundingBoxForElement(
    element: Element
  ): { x: number; y: number; width: number; height: number } | null {
    try {
      const paths = element.querySelectorAll('path');
      if (paths.length > 0) {
        const firstPath = paths[0] as SVGGraphicsElement;
        const bbox = firstPath.getBBox();
        const svgElement = this.svgContainer.nativeElement.querySelector('svg');

        const point = svgElement.createSVGPoint();
        point.x = bbox.x;
        point.y = bbox.y;

        let currentElement: Element | null = firstPath;
        while (currentElement && currentElement !== svgElement) {
          if (currentElement.tagName.toLowerCase() === 'g') {
            const groupTransform = currentElement.getAttribute('transform');
            if (groupTransform) {
              const ctm = (currentElement as SVGGraphicsElement).getCTM();
              if (ctm) {
                point.matrixTransform(ctm);
              }
            }
          }
          currentElement = currentElement.parentElement;
        }

        const svgTransform = window.getComputedStyle(svgElement).transform;
        if (svgTransform && svgTransform !== 'none') {
          const matrix = new DOMMatrix(svgTransform);
          point.x = point.x * matrix.m11 + matrix.e;
          point.y = point.y * matrix.m22 + matrix.f;
        }

        return {
          x: point.x,
          y: point.y,
          width: bbox.width * this.currentZoom,
          height: bbox.height * this.currentZoom,
        };
      }
    } catch (e) {
      console.error('Error al obtener el bounding box:', e);
    }

    return null;
  }

  private positionTooltip(event: MouseEvent): void {
    if (!this.tooltipContainer) return;

    const tooltip = this.tooltipContainer.nativeElement;
    const containerRect =
      this.svgContainer.nativeElement.getBoundingClientRect();
    const mouseX = event.clientX - containerRect.left;
    const mouseY = event.clientY - containerRect.top;

    const tooltipWidth = tooltip.offsetWidth;
    const tooltipHeight = tooltip.offsetHeight;
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;

    let posX = mouseX + 15;
    let posY = mouseY - 15;

    if (posX + tooltipWidth > containerWidth) {
      posX = mouseX - tooltipWidth - 10;
    }

    if (posY + tooltipHeight > containerHeight) {
      posY = mouseY - tooltipHeight - 10;
    }

    posX = Math.max(5, posX);
    posY = Math.max(5, posY);

    tooltip.style.left = `${posX}px`;
    tooltip.style.top = `${posY}px`;
  }

  private syncSvgWithBpmn(): void {
    if (!this.svgContainer) return;

    const svgElement = this.svgContainer.nativeElement.querySelector('svg');
    if (!svgElement) return;

    if (!this.isPanning && this.currentZoom === 1.0) {
      svgElement.style.transform = 'translate(0px, 0px) scale(1)';
    }
  }

  private removeWatermark(): void {
    setTimeout(() => {
      const poweredBy =
        this.bpmnContainer.nativeElement.querySelector('.bjs-powered-by');
      if (poweredBy) {
        poweredBy.remove();
      }
    }, 100);
  }

  zoomIn(): void {
    try {
      const svgElement = this.svgContainer?.nativeElement.querySelector('svg');
      if (!svgElement) return;

      const transform = window.getComputedStyle(svgElement).transform;
      let matrix = new DOMMatrix(transform);

      const newZoom = this.currentZoom * 1.2;

      matrix.m11 = newZoom;
      matrix.m22 = newZoom;

      svgElement.style.transform = matrix.toString();

      this.currentZoom = newZoom;

      if (this.bpmnViewer?.get) {
        const canvas = this.bpmnViewer.get('canvas');
        canvas.zoom(newZoom, 'center');
      }

      if (this.tooltipVisible && this.currentHighlighted) {
        this.positionTooltipForElement(
          this.currentHighlighted,
          new MouseEvent('click', {
            clientX: 0,
            clientY: 0,
          })
        );
      }
    } catch (error) {
      console.error('Error al hacer zoom in:', error);
    }
  }

  zoomOut(): void {
    try {
      const svgElement = this.svgContainer?.nativeElement.querySelector('svg');
      if (!svgElement) return;

      const transform = window.getComputedStyle(svgElement).transform;
      let matrix = new DOMMatrix(transform);

      const newZoom = this.currentZoom * 0.8;

      matrix.m11 = newZoom;
      matrix.m22 = newZoom;

      svgElement.style.transform = matrix.toString();

      this.currentZoom = newZoom;

      if (this.bpmnViewer?.get) {
        const canvas = this.bpmnViewer.get('canvas');
        canvas.zoom(newZoom, 'center');
      }

      if (this.tooltipVisible && this.currentHighlighted) {
        this.positionTooltipForElement(
          this.currentHighlighted,
          new MouseEvent('click', {
            clientX: 0,
            clientY: 0,
          })
        );
      }
    } catch (error) {
      console.error('Error al hacer zoom out:', error);
    }
  }

  resetZoom(): void {
    try {
      const svgElement = this.svgContainer?.nativeElement.querySelector('svg');
      if (svgElement) {
        svgElement.style.transformOrigin = '0 0';
        svgElement.style.transform = 'translate(0px, 0px) scale(1)';
      }

      this.currentZoom = 1.0;

      if (this.bpmnViewer?.get) {
        const canvas = this.bpmnViewer.get('canvas');
        canvas.zoom(1.0);

        canvas.viewbox({
          x: 0,
          y: 0,
          width: this.viewbox.width,
          height: this.viewbox.height,
        });
      }

      if (this.tooltipVisible && this.currentHighlighted) {
        this.positionTooltipForElement(
          this.currentHighlighted,
          new MouseEvent('click', {
            clientX: 0,
            clientY: 0,
          })
        );
      }
    } catch (error) {
      console.error('Error al resetear zoom:', error);
    }
  }
}
