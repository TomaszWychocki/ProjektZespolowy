<?php
include 'PhpSerial.php';

$serial = new PhpSerial;

$serial->deviceSet("/dev/ttyUSB0"); ///dev/ttyACM0
$serial->confBaudRate(9600);
$serial->confParity("none");
$serial->confCharacterLength(8);
$serial->confStopBits(1);
$serial->confFlowControl("none");


$serial->deviceOpen();
//sleep(0.5);

$command = (empty($_GET['cmd']) ? "noCommand" : $_GET['cmd']) . PHP_EOL;
$serial->sendMessage($command);

while(empty($read = $serial->readPort()));

$data = ['response' => str_replace("ERR\n\n","", $read),
         'command' => $command];
header('Content-type: application/json');
echo json_encode($data);

$serial->deviceClose();