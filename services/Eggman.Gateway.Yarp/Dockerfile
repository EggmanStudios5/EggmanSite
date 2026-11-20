FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

COPY Directory.Build.props ./
COPY contracts/Eggman.Contracts/Eggman.Contracts.csproj contracts/Eggman.Contracts/
COPY services/Eggman.ServiceDefaults/Eggman.ServiceDefaults.csproj services/Eggman.ServiceDefaults/
COPY services/Eggman.Gateway.Yarp/Eggman.Gateway.Yarp.csproj services/Eggman.Gateway.Yarp/
RUN dotnet restore services/Eggman.Gateway.Yarp/Eggman.Gateway.Yarp.csproj

COPY contracts/Eggman.Contracts/ contracts/Eggman.Contracts/
COPY services/Eggman.ServiceDefaults/ services/Eggman.ServiceDefaults/
COPY services/Eggman.Gateway.Yarp/ services/Eggman.Gateway.Yarp/
RUN dotnet publish services/Eggman.Gateway.Yarp/Eggman.Gateway.Yarp.csproj \
    -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:9.0-noble-chiseled AS runtime
WORKDIR /app
USER 1654:1654
COPY --from=build /app/publish ./
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
ENTRYPOINT ["/app/Eggman.Gateway.Yarp"]
