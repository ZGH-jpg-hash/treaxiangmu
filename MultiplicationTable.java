public class MultiplicationTable {
    public static void main(String[] args) {
        // Outer loop controls the number of rows, from 1 to 9
        for (int i = 1; i <= 9; i++) {
            // Inner loop controls the number of columns per row, from 1 to current row number
            for (int j = 1; j <= i; j++) {
                // Output multiplication expression and result, using tab for alignment
                System.out.print(j + " × " + i + " = " + (j * i) + "\t");
            }
            // New line after each row
            System.out.println();
        }
    }
}