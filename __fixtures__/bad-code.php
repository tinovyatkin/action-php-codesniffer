<?php
// PHP file with intentional PSR-12 violations for testing

namespace App\Example;

class badClassName {  // Class name should be PascalCase
    private $foo="bar";  // Missing spaces around =

    public function noDocBlock($param){  // Missing space before {
        if($param==true){  // Missing spaces around == and after if
            echo "hello";echo "world";  // Multiple statements on one line
        }
        else {  // else should be on same line as }
            return FALSE;  // Should use lowercase false
        }
    }

    function missingVisibility()  // Missing visibility keyword
    {
        $array = array(1,2,3);  // Should use short array syntax, missing spaces after commas
        foreach($array as $item)  // Missing space after foreach
        {
            ECHO $item;  // ECHO should be lowercase
        }
    }
}
