FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

COPY Directory.Build.props ./
COPY contracts/Eggman.Contracts/Eggman.Contracts.csproj contracts/Eggman.Contracts/
COPY services/Eggman.ServiceDefaults/Eggman.ServiceDefaults.csproj services/Eggman.ServiceDefaults/
COPY services/Eggman.IoT.Bridge/Eggman.IoT.Bridge.csproj services/Eggman.IoT.Bridge/
RUN dotnet restore services/Eggman.IoT.Bridge/Eggman.IoT.Bridge.csproj

COPY contracts/Eggman.Contracts/ contracts/Eggman.Contracts/
COPY services/Eggman.ServiceDefaults/ services/Eggman.ServiceDefaults/
COPY services/Eggman.IoT.Bridge/ services/Eggman.IoT.Bridge/
RUN dotnet publish services/Eggman.IoT.Bridge/Eggman.IoT.Bridge.csproj \
    -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:9.0-noble-chiseled AS runtime
WORKDIR /app
USER 1654:1654
COPY --from=build /app/publish ./
ENV ASPNETCORE_URLS=https://+:8443
EXPOSE 8443
ENTRYPOINT ["/app/Eggman.IoT.Bridge"]
