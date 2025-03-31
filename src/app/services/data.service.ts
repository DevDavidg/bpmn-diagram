import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DataService {
  private readonly dataUrl = 'assets/mock-data.json';

  constructor(private readonly http: HttpClient) {}

  getDashboards(): Observable<any> {
    return this.http.get<any>(this.dataUrl);
  }
}
