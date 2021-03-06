import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';

import {AppRoutingModule} from './app-routing.module';
import {AppComponent} from './app.component';
import {BcviewerComponent, ShowBlockComponent} from './bcviewer/bcviewer.component';
import {DialogOKCancelComponent} from '../lib/Ui';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatDialogModule} from '@angular/material/dialog';
import {DemoMaterialModule} from '../material-module';
import {FlexLayoutModule} from '@angular/flex-layout';
import {DialogTransactionComponent} from '../lib/dialog-transaction';
import {HandsonInputComponent} from '../lib/input';

@NgModule({
    declarations: [
        AppComponent,
        BcviewerComponent,
        ShowBlockComponent,
        DialogOKCancelComponent,
        DialogTransactionComponent,
        HandsonInputComponent,
    ],
    imports: [
        AppRoutingModule,
        BrowserModule,
        BrowserAnimationsModule,
        DemoMaterialModule,
        FormsModule,
        FlexLayoutModule,
        ReactiveFormsModule,
        MatDialogModule,
    ],
    entryComponents: [
        ShowBlockComponent,
        DialogTransactionComponent,
        DialogOKCancelComponent,
        HandsonInputComponent,
    ],
    providers: [],
    bootstrap: [AppComponent]
})
export class AppModule {
}
