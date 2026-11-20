var builder = DistributedApplication.CreateBuilder(args);

var releaseHub = builder.AddProject<Projects.Eggman_ReleaseHub>("eggman-releasehub");
var iotBridge = builder.AddProject<Projects.Eggman_IoT_Bridge>("eggman-iot-bridge");

builder.AddProject<Projects.Eggman_Gateway_Yarp>("eggman-gateway-yarp")
    .WithReference(releaseHub)
    .WithExternalHttpEndpoints();

_ = iotBridge;

builder.Build().Run();
