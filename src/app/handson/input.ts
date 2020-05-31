import {Component, Inject} from "@angular/core";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {Log} from "@c4dt/cothority/index";

interface IInput {
    title: string;
    input: string;
}

@Component({
    selector: "dialog-handson-input",
    templateUrl: "input.html"
})
export class HandsonInputComponent {
    constructor(
        public dialogRef: MatDialogRef<HandsonInputComponent>,
        @Inject(MAT_DIALOG_DATA) public data: IInput) {
    }
}